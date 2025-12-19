/**
 * AI Analysis HTML Renderer Service
 *
 * Purpose: Renders HTML templates for PDF pages 13-16 with AI analysis data
 * Used by: src/services/adobePdfFormFillerService.js (hybrid PDF generation)
 *
 * Flow:
 * 1. Load HTML templates from views/pdf/
 * 2. Inject data using Handlebars-style syntax
 * 3. Return rendered HTML ready for Puppeteer
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class AiAnalysisHtmlRenderer {
  constructor() {
    this.templatesDir = path.join(process.cwd(), 'views/pdf');
    this.templateCache = {}; // Cache loaded templates for performance
  }

  /**
   * Load a template file from disk (with caching)
   * @param {string} templateName - Template filename (e.g., 'page13-transcription.html')
   * @returns {Promise<string>} Template content
   */
  async loadTemplate(templateName) {
    // Check cache first
    if (this.templateCache[templateName]) {
      return this.templateCache[templateName];
    }

    try {
      const templatePath = path.join(this.templatesDir, templateName);
      const templateContent = await fs.readFile(templatePath, 'utf8');

      // Cache for future use
      this.templateCache[templateName] = templateContent;

      logger.info(`Loaded template: ${templateName}`);
      return templateContent;
    } catch (error) {
      logger.error(`Failed to load template: ${templateName}`, { error: error.message });
      throw new Error(`Template not found: ${templateName}`);
    }
  }

  /**
   * Simple Handlebars-style template rendering
   * Supports: {{variable}}, {{{html}}}, {{#if variable}}...{{/if}}
   *
   * IMPORTANT: Regex patterns must use exactly 2 opening and 2 closing braces:
   *   - Correct: /\{\{(\w+)\}\}/g matches {{variable}}
   *   - Wrong:   /\{\{(\w+)\}\}\}/g matches {{variable}}} (extra brace!)
   *
   * @param {string} template - HTML template with placeholders
   * @param {object} data - Data to inject
   * @returns {string} Rendered HTML
   */
  renderTemplate(template, data) {
    let rendered = template;

    // Handle {{#if variable}}...{{else}}...{{/if}} blocks
    // Checks if variable is truthy (non-empty string, non-empty object, number, or true boolean)
    rendered = rendered.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
      (match, varName, trueBlock, falseBlock = '') => {
        const value = data[varName];
        const hasValue = value && (
          (typeof value === 'string' && value.trim() !== '') ||
          (typeof value === 'object' && Object.keys(value).length > 0) ||
          (typeof value === 'number') ||
          (typeof value === 'boolean' && value === true)
        );
        return hasValue ? trueBlock : falseBlock;
      }
    );

    // Handle {{{unescaped}}} (for HTML content - closing statement, final review)
    // Triple braces = raw HTML insertion without escaping
    rendered = rendered.replace(/\{\{\{(\w+)\}\}\}/g, (match, varName) => {
      return data[varName] || '';
    });

    // Handle {{escaped}} (for plain text - voice transcription, metadata)
    // Double braces = HTML-escaped text for security
    // CRITICAL: Must be exactly 2 opening \{\{ and 2 closing \}\} braces
    rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = data[varName] || '';
      // HTML escape for XSS protection
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    });

    return rendered;
  }

  /**
   * Render Page 13 - Voice Transcription & Quality Review
   *
   * @param {object} data - AI analysis data
   * @param {string} data.voice_transcription - User's transcribed voice statement
   * @param {object} data.analysis_metadata - AI model info (model, timestamp, version)
   * @param {string} data.quality_review - Quality assessment text
   * @returns {Promise<string>} Rendered HTML
   */
  async renderPage13(data) {
    try {
      const template = await this.loadTemplate('page13-transcription.html');

      // Format analysis metadata for display
      const analysis_metadata = this.formatAnalysisMetadata(data.analysis_metadata);

      const rendered = this.renderTemplate(template, {
        voice_transcription: data.voice_transcription || '',
        analysis_metadata,
        quality_review: data.quality_review || ''
      });

      // DEBUG: Save rendered HTML to file for inspection
      const fs = require('fs').promises;
      const debugPath = path.join(process.cwd(), 'test-output', 'debug-page13.html');
      await fs.writeFile(debugPath, rendered, 'utf8').catch(err =>
        logger.warn('Could not save debug HTML', { error: err.message })
      );
      logger.info('DEBUG: Saved rendered Page 13 HTML', { path: debugPath });

      logger.info('Rendered Page 13 template', {
        hasTranscription: !!data.voice_transcription,
        hasMetadata: !!data.analysis_metadata,
        hasQualityReview: !!data.quality_review
      });

      return rendered;
    } catch (error) {
      logger.error('Failed to render Page 13', { error: error.message });
      throw error;
    }
  }

  /**
   * Render Page 14 - Legal Closing Statement
   *
   * @param {object} data - AI analysis data
   * @param {string} data.closing_statement - Comprehensive legal statement (HTML format)
   * @returns {Promise<string>} Rendered HTML
   */
  async renderPage14(data) {
    try {
      const template = await this.loadTemplate('page14-closing-statement.html');

      const rendered = this.renderTemplate(template, {
        closing_statement: data.closing_statement || ''
      });

      logger.info('Rendered Page 14 template', {
        hasStatement: !!data.closing_statement,
        statementLength: data.closing_statement?.length || 0
      });

      return rendered;
    } catch (error) {
      logger.error('Failed to render Page 14', { error: error.message });
      throw error;
    }
  }

  /**
   * Render Page 15 - AI Summary & Key Points
   *
   * @param {object} data - AI analysis data
   * @param {string} data.ai_summary - AI-generated summary with key points (HTML format)
   * @returns {Promise<string>} Rendered HTML
   */
  async renderPage15(data) {
    try {
      const template = await this.loadTemplate('page15-summary.html');

      const rendered = this.renderTemplate(template, {
        ai_summary: data.ai_summary || ''
      });

      logger.info('Rendered Page 15 template', {
        hasSummary: !!data.ai_summary,
        summaryLength: data.ai_summary?.length || 0
      });

      return rendered;
    } catch (error) {
      logger.error('Failed to render Page 15', { error: error.message });
      throw error;
    }
  }

  /**
   * Render Page 16 - Final Review & Next Steps
   *
   * @param {object} data - AI analysis data
   * @param {string} data.final_review - Final review with recommendations (HTML format)
   * @returns {Promise<string>} Rendered HTML
   */
  async renderPage16(data) {
    try {
      const template = await this.loadTemplate('page16-final-review.html');

      // Extract next steps from final review text and render as checklist HTML
      const nextStepsHtml = this.buildNextStepsHtml(data.final_review || '');

      const rendered = this.renderTemplate(template, {
        final_review: data.final_review || '',
        next_steps_html: nextStepsHtml
      });

      logger.info('Rendered Page 16 template', {
        hasReview: !!data.final_review,
        reviewLength: data.final_review?.length || 0
      });

      return rendered;
    } catch (error) {
      logger.error('Failed to render Page 16', { error: error.message });
      throw error;
    }
  }

  /**
   * Render all AI analysis pages (13-16) at once
   *
   * @param {object} data - Complete AI analysis data from database
   * @returns {Promise<object>} Object with page13, page14, page15, page16 HTML strings
   */
  async renderAllPages(data) {
    try {
      logger.info('Rendering all AI analysis pages (13-16)');

      const [page13, page14, page15, page16] = await Promise.all([
        this.renderPage13(data),
        this.renderPage14(data),
        this.renderPage15(data),
        this.renderPage16(data)
      ]);

      logger.info('Successfully rendered all 4 AI analysis pages');

      return {
        page13,
        page14,
        page15,
        page16
      };
    } catch (error) {
      logger.error('Failed to render all pages', { error: error.message });
      throw error;
    }
  }

  /**
   * Build HTML for next steps checklist from the final_review text
   * Looks for a "Next Steps:" section and converts numbered items to a checklist.
   */
  buildNextStepsHtml(finalReviewText) {
    if (!finalReviewText || typeof finalReviewText !== 'string') return '';

    // Extract the "Next Steps" block between markers (or to end of string)
    let stepsBlock = '';
    const nextStepsMatch = finalReviewText.match(/Next Steps:\n([\s\S]*?)(?:\n\nLegal Considerations:|\nLegal Considerations:|$)/);
    if (nextStepsMatch && nextStepsMatch[1]) {
      stepsBlock = nextStepsMatch[1];
    }

    if (!stepsBlock) return '';

    // Split into individual steps, stripping leading numbers/bullets
    const steps = stepsBlock
      .split(/\n+/)
      .map(line => line.replace(/^\s*\d+[\).\s-]?\s*/, '').trim())
      .filter(Boolean);

    if (steps.length === 0) return '';

    const itemsHtml = steps
      .map(step => `<li><span class="checkbox"></span><span class="step-text">${step}</span></li>`)
      .join('\n');

    return `<ul class="next-steps-checklist">${itemsHtml}</ul>`;
  }

  /**
   * Format analysis metadata for display
   * Converts JSONB object to readable string
   *
   * @param {object} metadata - Analysis metadata from database
   * @param {string} metadata.model - AI model name (e.g., 'GPT-4o')
   * @param {string} metadata.timestamp - ISO timestamp
   * @param {string} metadata.version - Version string (e.g., 'v1.2')
   * @returns {string} Formatted metadata string
   */
  formatAnalysisMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
      return 'Not yet generated';
    }

    const parts = [];

    if (metadata.model) {
      parts.push(`Model: ${metadata.model}`);
    }

    if (metadata.timestamp) {
      try {
        const date = new Date(metadata.timestamp);
        // UK date format: DD/MM/YYYY, HH:MM GMT
        const formatted = date.toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/London',
          timeZoneName: 'short'
        });
        parts.push(`Generated: ${formatted}`);
      } catch (error) {
        logger.warn('Failed to format timestamp', { timestamp: metadata.timestamp });
      }
    }

    if (metadata.version) {
      parts.push(`v${metadata.version}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'Not yet generated';
  }

  /**
   * Clear template cache (useful for development/testing)
   */
  clearCache() {
    this.templateCache = {};
    logger.info('Template cache cleared');
  }
}

// Export singleton instance
module.exports = new AiAnalysisHtmlRenderer();
