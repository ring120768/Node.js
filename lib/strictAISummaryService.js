'use strict';

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

class StrictAISummaryService {
    constructor(supabase, logger = console) {
        this.supabase = supabase;
        this.logger = logger;
        this.apiKey = process.env.OPENAI_API_KEY;

        if (!this.apiKey) {
            throw new Error('OPENAI_API_KEY is required for AI summary generation');
        }

        this.openai = new OpenAI({ 
            apiKey: this.apiKey 
        });

        // Validation thresholds
        this.MIN_WORD_COUNT = 50;
        this.MIN_FACT_COUNT = 5;
        this.MIN_QUALITY_SCORE = 0.6;
    }

    // AI Summary generation prompt - FACTUAL DATA ONLY
    getSystemPrompt() {
        return `You are an AI assistant specialized in creating concise, factual summaries of car accident transcriptions for UK legal proceedings.

CRITICAL REQUIREMENTS - NO FABRICATED DATA:
- Use ONLY factual information explicitly provided in the transcription
- NEVER invent, infer, speculate, or add any details not clearly stated
- NEVER use placeholder data, example scenarios, or hypothetical information
- NEVER assume standard details that "typically occur" in accidents
- DO NOT generate any content if factual data is insufficient
- If any information is missing or unclear, explicitly state "Not mentioned" or "Details not provided"
- Use neutral, objective language without blame or fault attribution
- Focus exclusively on observable facts and direct statements from the transcription

DATA SUFFICIENCY REQUIREMENTS:
Before generating any summary, verify the transcription contains:
- At least 5 concrete, factual statements about the incident
- Clear details about what actually happened (not vague descriptions)
- Specific information about location, time, vehicles, or parties involved
- Verifiable facts that can be used in legal proceedings

ERROR CONDITIONS - When to return error messages instead of summary:
1. If transcription is empty, unclear, or contains less than 50 meaningful words: "Service is Unavailable - insufficient transcription data"
2. If transcription contains fewer than 5 concrete facts: "There is not currently enough data to provide you with a substantial summary"
3. If transcription appears to be test data, placeholder content, or gibberish: "Service is Unavailable - transcription quality insufficient for legal use"
4. If transcription is mainly emotional content without factual incident details: "There is not currently enough data to provide you with a substantial summary"

ONLY proceed with summary generation if transcription meets all sufficiency requirements.

Your task is to analyze the provided transcription and create a structured summary that includes:

1. **Key Facts**: Extract only the factual details explicitly mentioned (date, time, location, parties involved)
2. **Sequence of Events**: Chronological account based only on what was stated
3. **Damage Assessment**: Description of damage and injuries only as described in the transcription
4. **Legal Considerations**: Mention only evidence or witness information explicitly stated
5. **Information Gaps**: Clearly identify any missing or incomplete information

Guidelines:
- Use clear, professional language suitable for legal documentation
- Never fill in gaps with assumptions or common scenarios
- Mark all uncertain or unclear information as such
- Highlight any contradictions or unclear statements
- Use UK legal terminology and spellings
- Include disclaimer if transcription quality affects accuracy
- End with statement about data limitations if applicable

Remember: It is better to return an error message than to generate a summary with insufficient or unreliable data.`;
    }

    /**
     * Validate transcription quality before processing
     */
    validateTranscription(transcription) {
        if (!transcription || typeof transcription !== 'string') {
            return {
                valid: false,
                error: 'Service is Unavailable - no transcription data provided'
            };
        }

        // Clean and analyze transcription
        const cleanText = transcription.trim();
        const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length;

        // Check minimum word count
        if (wordCount < this.MIN_WORD_COUNT) {
            return {
                valid: false,
                error: 'Service is Unavailable - insufficient transcription data',
                details: `Transcription contains only ${wordCount} words (minimum: ${this.MIN_WORD_COUNT})`
            };
        }

        // Detect test/placeholder data patterns
        const testPatterns = [
            /test\s+test\s+test/i,
            /lorem\s+ipsum/i,
            /example\s+text/i,
            /placeholder/i,
            /dummy\s+data/i,
            /sample\s+accident/i,
            /this\s+is\s+a\s+test/i
        ];

        for (const pattern of testPatterns) {
            if (pattern.test(cleanText)) {
                return {
                    valid: false,
                    error: 'Service is Unavailable - transcription quality insufficient for legal use',
                    details: 'Test or placeholder content detected'
                };
            }
        }

        // Detect gibberish or nonsensical content
        const gibberishScore = this.calculateGibberishScore(cleanText);
        if (gibberishScore > 0.7) {
            return {
                valid: false,
                error: 'Service is Unavailable - transcription quality insufficient for legal use',
                details: 'Transcription appears to contain nonsensical content'
            };
        }

        // Extract and count concrete facts
        const facts = this.extractFacts(cleanText);
        if (facts.length < this.MIN_FACT_COUNT) {
            return {
                valid: false,
                error: 'There is not currently enough data to provide you with a substantial summary',
                details: `Only ${facts.length} concrete facts found (minimum: ${this.MIN_FACT_COUNT})`
            };
        }

        // Calculate overall quality score
        const qualityScore = this.calculateQualityScore(cleanText, facts);
        if (qualityScore < this.MIN_QUALITY_SCORE) {
            return {
                valid: false,
                error: 'There is not currently enough data to provide you with a substantial summary',
                details: 'Transcription lacks sufficient detail for legal documentation'
            };
        }

        return {
            valid: true,
            wordCount,
            factCount: facts.length,
            facts,
            qualityScore
        };
    }

    /**
     * Extract concrete facts from transcription
     */
    extractFacts(text) {
        const facts = [];
        const textLower = text.toLowerCase();

        // Patterns for factual information
        const factPatterns = [
            // Date patterns
            /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
            /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/gi,

            // Time patterns
            /\b\d{1,2}:\d{2}\s?(am|pm)?\b/gi,
            /\b(morning|afternoon|evening|night)\b/gi,

            // Location patterns
            /\b(street|road|avenue|lane|highway|motorway|junction|roundabout)\b/gi,
            /\b[A-Z][a-z]+\s+(Street|Road|Avenue|Lane)\b/g,
            /\bM\d+\b/g, // UK motorways
            /\bA\d+\b/g,  // UK A-roads

            // Vehicle patterns
            /\b(car|van|truck|lorry|bus|motorcycle|bicycle)\b/gi,
            /\b(red|blue|black|white|silver|grey|green)\s+(car|van|vehicle)\b/gi,
            /\b[A-Z]{2}\d{2}\s?[A-Z]{3}\b/g, // UK license plates

            // Speed patterns
            /\b\d+\s?(mph|miles per hour|km\/h|kilometres per hour)\b/gi,

            // Weather patterns
            /\b(rain|snow|fog|clear|sunny|cloudy|wet|dry|icy)\b/gi,

            // Injury patterns
            /\b(injury|pain|hurt|bleeding|bruise|fracture|concussion|whiplash)\b/gi,

            // Witness patterns
            /\b(witness|saw|observed|noticed)\b/gi,

            // Police/emergency patterns
            /\b(police|ambulance|fire|999|emergency|officer)\b/gi
        ];

        // Check each pattern
        factPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    // Get context around the match (20 words before and after)
                    const contextPattern = new RegExp(
                        `(\\S+\\s+){0,20}${match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s+\\S+){0,20}`,
                        'gi'
                    );
                    const context = text.match(contextPattern);
                    if (context && context[0].trim().length > match.length) {
                        facts.push({
                            fact: match,
                            context: context[0].trim(),
                            type: this.categorizeFactType(match)
                        });
                    }
                });
            }
        });

        // Remove duplicates
        const uniqueFacts = facts.filter((fact, index, self) =>
            index === self.findIndex((f) => f.context === fact.context)
        );

        return uniqueFacts;
    }

    /**
     * Categorize fact type for better organization
     */
    categorizeFactType(fact) {
        const factLower = fact.toLowerCase();

        if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(fact) || 
            /(january|february|march|april|may|june|july|august|september|october|november|december)/i.test(fact)) {
            return 'date';
        }
        if (/\d{1,2}:\d{2}/.test(fact) || /(morning|afternoon|evening|night)/i.test(fact)) {
            return 'time';
        }
        if (/(street|road|avenue|lane|highway|motorway|junction|roundabout|M\d+|A\d+)/i.test(fact)) {
            return 'location';
        }
        if (/(car|van|truck|lorry|bus|motorcycle|bicycle)/i.test(fact)) {
            return 'vehicle';
        }
        if (/\d+\s?(mph|miles per hour|km\/h)/i.test(fact)) {
            return 'speed';
        }
        if (/(rain|snow|fog|clear|sunny|cloudy|wet|dry|icy)/i.test(fact)) {
            return 'weather';
        }
        if (/(injury|pain|hurt|bleeding|bruise|fracture|concussion|whiplash)/i.test(fact)) {
            return 'injury';
        }
        if (/(witness|saw|observed)/i.test(fact)) {
            return 'witness';
        }
        if (/(police|ambulance|emergency|999|officer)/i.test(fact)) {
            return 'emergency';
        }

        return 'other';
    }

    /**
     * Calculate gibberish score (0-1, higher = more gibberish)
     */
    calculateGibberishScore(text) {
        const words = text.split(/\s+/);
        let gibberishCount = 0;

        words.forEach(word => {
            // Check for excessive consonants
            const consonantRatio = (word.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length / word.length;
            if (consonantRatio > 0.85 && word.length > 4) {
                gibberishCount++;
            }

            // Check for repeated characters
            if (/(.)\1{3,}/.test(word)) {
                gibberishCount++;
            }

            // Check for random character sequences
            if (word.length > 10 && !/[aeiou]/i.test(word)) {
                gibberishCount++;
            }
        });

        return gibberishCount / words.length;
    }

    /**
     * Calculate overall quality score
     */
    calculateQualityScore(text, facts) {
        let score = 0;
        const maxScore = 10;

        // Word count score (up to 2 points)
        const wordCount = text.split(/\s+/).length;
        score += Math.min(2, wordCount / 100);

        // Fact count score (up to 3 points)
        score += Math.min(3, facts.length / 5);

        // Fact diversity score (up to 2 points)
        const factTypes = new Set(facts.map(f => f.type));
        score += Math.min(2, factTypes.size / 4);

        // Sentence structure score (up to 2 points)
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
        if (avgSentenceLength >= 5 && avgSentenceLength <= 25) {
            score += 2;
        } else if (avgSentenceLength >= 3 && avgSentenceLength <= 35) {
            score += 1;
        }

        // Coherence score (up to 1 point)
        const hasLogicalFlow = this.checkLogicalFlow(text);
        if (hasLogicalFlow) {
            score += 1;
        }

        return score / maxScore;
    }

    /**
     * Check if text has logical flow
     */
    checkLogicalFlow(text) {
        const sequenceWords = [
            'then', 'after', 'before', 'next', 'subsequently',
            'following', 'prior', 'during', 'while', 'when'
        ];

        let sequenceCount = 0;
        sequenceWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const matches = text.match(regex);
            if (matches) {
                sequenceCount += matches.length;
            }
        });

        return sequenceCount >= 2;
    }

    /**
     * Generate AI summary with strict validation
     */
    async generateSummary(transcriptionText, userId, incidentId) {
        try {
            if (!transcriptionText || transcriptionText.trim().length < 50) {
                throw new Error('Transcription text too short for reliable summary generation');
            }

            this.logger.info(`📝 Generating strict AI summary for user: ${userId}`);

            // Validate transcription first
            const validation = this.validateTranscription(transcriptionText);

            if (!validation.valid) {
                this.logger.warn(`❌ Transcription validation failed: ${validation.error}`);

                // Log validation failure to database
                if (this.supabase) {
                    await this.supabase
                        .from('ai_summary_errors')
                        .insert({
                            user_id: userId,
                            incident_id: incidentId,
                            error_type: 'VALIDATION_FAILED',
                            error_message: validation.error,
                            error_details: validation.details,
                            transcription_length: transcriptionText ? transcriptionText.length : 0,
                            created_at: new Date().toISOString()
                        });
                }

                return {
                    success: false,
                    error: validation.error,
                    details: validation.details,
                    validation: validation
                };
            }

            this.logger.info(`✅ Transcription validated: ${validation.wordCount} words, ${validation.factCount} facts`);

            // Generate AI summary using OpenAI
            const aiSummary = await this.callOpenAI(transcriptionText);

            if (!aiSummary) {
                throw new Error('Failed to generate AI summary - no response from OpenAI');
            }

            // Check if AI returned an error message
            if (aiSummary.includes('Service is Unavailable') || 
                aiSummary.includes('not currently enough data')) {
                this.logger.warn('❌ AI determined insufficient data for summary');

                return {
                    success: false,
                    error: aiSummary,
                    validation: validation
                };
            }

            // Parse the summary into structured format
            const structuredSummary = this.parseStructuredSummary(aiSummary);

            // Save to database
            if (this.supabase && userId) {
                const { data: savedSummary, error: saveError } = await this.supabase
                    .from('ai_summary')
                    .insert({
                        create_user_id: userId,
                        user_id: userId,
                        incident_id: incidentId,
                        summary_text: aiSummary,
                        key_facts: structuredSummary.keyFacts,
                        sequence_of_events: structuredSummary.sequence,
                        damage_assessment: structuredSummary.damage,
                        legal_considerations: structuredSummary.legal,
                        information_gaps: structuredSummary.gaps,
                        validation_score: validation.qualityScore,
                        fact_count: validation.factCount,
                        word_count: validation.wordCount,
                        summary_type: 'strict_factual',
                        created_at: new Date().toISOString(),
                        metadata: {
                            model: 'gpt-4',
                            temperature: 0.1,
                            validation: validation
                        }
                    })
                    .select()
                    .single();

                if (saveError) {
                    this.logger.error(`Failed to save summary: ${saveError.message}`);
                } else {
                    this.logger.success(`✅ Summary saved with ID: ${savedSummary.id}`);
                }
            }

            return {
                success: true,
                summaryId: savedSummary?.id,
                summary: aiSummary,
                structured: structuredSummary,
                validation: validation,
                wordCount: aiSummary.split(' ').length,
                factCount: validation.factCount,
                qualityScore: validation.qualityScore,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    model: 'gpt-4',
                    factCount: validation.factCount,
                    wordCount: validation.wordCount,
                    qualityScore: validation.qualityScore
                }
            };

        } catch (error) {
            this.logger.error(`❌ Summary generation error: ${error.message}`);

            // Log error to database
            if (this.supabase && userId) {
                await this.supabase
                    .from('ai_summary_errors')
                    .insert({
                        user_id: userId,
                        incident_id: incidentId,
                        error_type: 'GENERATION_FAILED',
                        error_message: error.message,
                        error_stack: error.stack,
                        created_at: new Date().toISOString()
                    });
            }

            return {
                success: false,
                error: 'Failed to generate summary',
                details: error.message
            };
        }
    }

    async callOpenAI(transcriptionText) {
        const prompt = `You are a legal expert creating a precise incident summary. Based on this accident description, provide a structured summary with these exact sections:

**INCIDENT OVERVIEW:**
[Brief factual description]

**KEY FACTS:**
• [Bullet point facts only]
• [No speculation or assumptions]
• [Stick to what was explicitly stated]

**PARTIES INVOLVED:**
• [Names and roles if mentioned]
• [Vehicle details if provided]

**CIRCUMSTANCES:**
• [Time, location, weather if mentioned]
• [Traffic conditions if stated]

**DAMAGES/INJURIES:**
• [Only what was explicitly described]
• [No medical assumptions]

**IMPORTANT:** Only include facts explicitly stated in the transcript. Do not infer, assume, or add details not mentioned.

Transcript: "${transcriptionText}"`;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: this.getSystemPrompt()
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1500,
                temperature: 0.1
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            this.logger.error('OpenAI API error:', error);
            throw new Error(`OpenAI API failed: ${error.message}`);
        }
    }

    /**
     * Parse structured summary from AI response
     */
    parseStructuredSummary(summaryText) {
        const structured = {
            keyFacts: [],
            sequence: [],
            damage: [],
            legal: [],
            gaps: []
        };

        // Parse sections using headers
        const sections = {
            'Key Facts': 'keyFacts',
            'Sequence of Events': 'sequence',
            'Damage Assessment': 'damage',
            'Legal Considerations': 'legal',
            'Information Gaps': 'gaps'
        };

        for (const [header, field] of Object.entries(sections)) {
            const regex = new RegExp(`\\*\\*${header}\\*\\*:?([\\s\\S]*?)(?=\\*\\*|$)`, 'i');
            const match = summaryText.match(regex);

            if (match && match[1]) {
                const content = match[1].trim();
                // Extract bullet points or numbered items
                const items = content.match(/[-•\d]+\.\s*(.+)/g) || [];
                structured[field] = items.map(item => 
                    item.replace(/^[-•\d]+\.\s*/, '').trim()
                );

                // If no bullet points, treat as single item
                if (structured[field].length === 0 && content.length > 0) {
                    structured[field] = [content];
                }
            }
        }

        return structured;
    }

    validateSummary(summary) {
        // Count facts (bullet points)
        const factMatches = summary.match(/•/g) || [];
        const factCount = factMatches.length;

        // Check for required sections
        const requiredSections = [
            'INCIDENT OVERVIEW',
            'KEY FACTS',
            'PARTIES INVOLVED',
            'CIRCUMSTANCES'
        ];

        const sectionsPresent = requiredSections.filter(section => 
            summary.includes(section)
        ).length;

        // Calculate quality score
        const completenessScore = (sectionsPresent / requiredSections.length) * 100;
        const factDensityScore = Math.min((factCount / 5) * 100, 100); // Target 5+ facts
        const score = Math.round((completenessScore + factDensityScore) / 2);

        return {
            factCount,
            sectionsPresent,
            requiredSections: requiredSections.length,
            score,
            isValid: score >= 70
        };
    }

    /**
     * Get summary by ID
     */
    async getSummary(summaryId) {
        if (!this.supabase) {
            throw new Error('Database not configured');
        }

        const { data, error } = await this.supabase
            .from('ai_summary')
            .select('*')
            .eq('id', summaryId)
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    /**
     * Get summaries for user
     */
    async getUserSummaries(userId, limit = 10) {
        if (!this.supabase) {
            throw new Error('Database not configured');
        }

        const { data, error } = await this.supabase
            .from('ai_summary')
            .select('*')
            .eq('user_id', userId)
            .eq('summary_type', 'strict_factual')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            throw error;
        }

        return data || [];
    }
}

module.exports = StrictAISummaryService;