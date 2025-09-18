import api from './api';

class TemplatesAPI {
  // Get all templates
  async getTemplates(params = {}) {
    try {
      const { category = 'all', limit = 20, skip = 0 } = params;
      const response = await api.get('/templates', { params: { category, limit, skip } });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get template categories
  async getCategories() {
    try {
      const response = await api.get('/templates/categories');
      return response.data.categories;
    } catch (error) {
      throw error;
    }
  }

  // Get popular templates
  async getPopularTemplates() {
    try {
      const response = await api.get('/templates/popular');
      return response.data.templates;
    } catch (error) {
      throw error;
    }
  }

  // Create a new template
  async createTemplate(templateData) {
    try {
      const response = await api.post('/templates', templateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Use template to create server
  async useTemplate(templateId, serverData) {
    try {
      const response = await api.post(`/templates/${templateId}/use`, serverData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Delete template
  async deleteTemplate(templateId) {
    try {
      const response = await api.delete(`/templates/${templateId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

const templatesAPI = new TemplatesAPI();
export default templatesAPI;
