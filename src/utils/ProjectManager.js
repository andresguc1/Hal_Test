import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { validateProject, validateFlow, MVP_LIMITS } from './validation';
import { logger } from './logger';

class ProjectManager {
    // ========================================
    // PROJECTS
    // ========================================

    async createProject(name, description = '') {
        const project = {
            id: uuidv4(),
            name,
            description,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            activeFlowId: null,
            settings: {
                autoSave: true,
                autoSaveInterval: 2000
            }
        };

        await db.projects.add(project);
        logger.info('Project created', { id: project.id, name }, 'ProjectManager');
        return project;
    }

    async getProject(projectId) {
        const project = await db.projects.get(projectId);
        if (!project) return null;

        // Load flows for this project
        const flows = await db.flows.where('projectId').equals(projectId).toArray();
        return { ...project, flows };
    }

    async updateProject(projectId, updates) {
        const project = await this.getProject(projectId);
        if (!project) throw new Error('Project not found');

        const updatedProject = {
            ...project,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // Validate before saving (excluding flows array which is stored separately)
        // We only validate size here roughly
        validateProject(updatedProject);

        // Remove flows from object before saving to projects table
        const { flows: _flows, ...projectData } = updatedProject;

        await db.projects.put(projectData);
        return updatedProject;
    }

    async deleteProject(projectId) {
        await db.transaction('rw', db.projects, db.flows, db.versions, async () => {
            await db.flows.where('projectId').equals(projectId).delete();
            await db.versions.where('projectId').equals(projectId).delete();
            await db.projects.delete(projectId);
        });
        logger.info('Project deleted', { projectId }, 'ProjectManager');
    }

    async listProjects() {
        return await db.projects.orderBy('updatedAt').reverse().toArray();
    }

    // ========================================
    // FLOWS
    // ========================================

    async createFlow(projectId, name) {
        // Check limits
        const count = await db.flows.where('projectId').equals(projectId).count();
        if (count >= MVP_LIMITS.MAX_FLOWS_PER_PROJECT) {
            throw new Error(`Maximum ${MVP_LIMITS.MAX_FLOWS_PER_PROJECT} flows allowed per project`);
        }

        const flow = {
            id: uuidv4(),
            projectId,
            name,
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await db.flows.add(flow);

        // Update project active flow if none
        const project = await db.projects.get(projectId);
        if (project && !project.activeFlowId) {
            await db.projects.update(projectId, { activeFlowId: flow.id });
        }

        return flow;
    }

    async getFlow(projectId, flowId) {
        return await db.flows.get({ projectId, id: flowId });
    }

    async updateFlow(projectId, flowId, flowData) {
        const flow = await this.getFlow(projectId, flowId);
        if (!flow) throw new Error('Flow not found');

        const updatedFlow = {
            ...flow,
            ...flowData,
            updatedAt: new Date().toISOString()
        };

        validateFlow(updatedFlow);

        await db.flows.put(updatedFlow);

        // Update project timestamp
        await db.projects.update(projectId, { updatedAt: new Date().toISOString() });

        return updatedFlow;
    }

    async deleteFlow(projectId, flowId) {
        await db.flows.delete(flowId);

        // Update active flow if needed
        const project = await db.projects.get(projectId);
        if (project && project.activeFlowId === flowId) {
            const remainingFlow = await db.flows.where('projectId').equals(projectId).first();
            await db.projects.update(projectId, {
                activeFlowId: remainingFlow ? remainingFlow.id : null
            });
        }
    }

    // ========================================
    // VERSIONING
    // ========================================

    async saveVersion(projectId, message, auto = false) {
        const project = await this.getProject(projectId);
        if (!project) return;

        // Check limit
        const count = await db.versions.where('projectId').equals(projectId).count();
        if (count >= MVP_LIMITS.MAX_VERSIONS_PER_PROJECT) {
            // Delete oldest
            const oldest = await db.versions.where('projectId').equals(projectId).sortBy('timestamp');
            if (oldest.length > 0) {
                await db.versions.delete(oldest[0].id);
            }
        }

        const version = {
            id: uuidv4(),
            projectId,
            timestamp: new Date().toISOString(),
            message,
            snapshot: project, // Stores full project state including flows
            auto
        };

        await db.versions.add(version);
        return version;
    }

    async getVersionHistory(projectId) {
        return await db.versions
            .where('projectId')
            .equals(projectId)
            .reverse()
            .sortBy('timestamp');
    }

    async restoreVersion(projectId, versionId) {
        const version = await db.versions.get(versionId);
        if (!version) throw new Error('Version not found');

        const { snapshot } = version;

        await db.transaction('rw', db.projects, db.flows, async () => {
            // Restore project
            const { flows, ...projectData } = snapshot;
            await db.projects.put(projectData);

            // Restore flows (delete existing and add from snapshot)
            await db.flows.where('projectId').equals(projectId).delete();
            if (flows && flows.length > 0) {
                await db.flows.bulkAdd(flows);
            }
        });

        return snapshot;
    }
}

export const projectManager = new ProjectManager();
