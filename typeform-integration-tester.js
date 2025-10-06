
/**
 * TYPEFORM UUID INTEGRATION TESTER
 * Comprehensive debugging and testing utilities for end-to-end validation
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// Initialize Supabase (if available)
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

class TypeformIntegrationTester {
  constructor() {
    this.testResults = [];
    this.baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  }

  /**
   * Generate test UUID for consistent testing
   */
  generateTestUUID() {
    return crypto.randomUUID();
  }

  /**
   * Generate auth code for validation
   */
  generateAuthCode(userId, productId = 'incident_report') {
    const secret = process.env.WEBHOOK_SECRET || 'default_secret';
    const data = `${userId}:${productId}:${secret}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Log test step with timestamp and formatting
   */
  log(step, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      step,
      message,
      data
    };

    console.log(`\n🧪 [${timestamp}] STEP ${step}: ${message}`);
    if (data) {
      console.log('   📊 Data:', JSON.stringify(data, null, 2));
    }

    this.testResults.push(logEntry);
    return logEntry;
  }

  /**
   * Test 1: Typeform URL Generation
   */
  async testTypeformUrlGeneration() {
    this.log('1A', 'Testing Typeform URL generation with UUID parameters');

    const testUserId = this.generateTestUUID();
    const formTypes = ['incident', 'signup'];
    const results = {};

    for (const formType of formTypes) {
      try {
        this.log('1B', `Generating ${formType} form URL`, { userId: testUserId.substring(0, 8) + '...' });

        const response = await axios.get(`${this.baseUrl}/api/redirect-to-typeform/${formType}`, {
          params: {
            userId: testUserId,
            test_mode: 'true',
            source: 'integration_test'
          },
          timeout: 10000
        });

        if (response.data.success && response.data.typeform_url) {
          const url = new URL(response.data.typeform_url);
          const params = new URLSearchParams(url.hash.substring(1)); // Remove # from hash

          results[formType] = {
            success: true,
            url: response.data.typeform_url,
            parameters: Object.fromEntries(params.entries()),
            hasUserId: params.has('user_id'),
            hasAuthCode: params.has('auth_code'),
            hasProductId: params.has('product_id')
          };

          this.log('1C', `✅ ${formType} URL generated successfully`, {
            url: response.data.typeform_url,
            paramCount: params.size,
            hasRequiredParams: params.has('user_id') && params.has('auth_code')
          });
        } else {
          results[formType] = { success: false, error: 'Invalid response from redirect service' };
          this.log('1D', `❌ ${formType} URL generation failed`, response.data);
        }

      } catch (error) {
        results[formType] = { success: false, error: error.message };
        this.log('1E', `❌ ${formType} URL generation error: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Test 2: Webhook UUID Extraction
   */
  async testWebhookUuidExtraction() {
    this.log('2A', 'Testing webhook UUID extraction from various sources');

    const testUserId = this.generateTestUUID();
    const authCode = this.generateAuthCode(testUserId);
    const results = {};

    // Test different webhook payload formats
    const payloadFormats = {
      hidden_fields: {
        event_id: 'test_event_hidden',
        event_type: 'form_response',
        form_response: {
          form_id: 'WvM2ejru',
          token: 'test_token_hidden',
          landed_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          hidden: {
            user_id: testUserId,
            product_id: 'incident_report',
            auth_code: authCode
          },
          answers: [
            {
              field: { id: 'test1', ref: 'driver_name', type: 'short_text' },
              type: 'text',
              text: 'Test Driver Name'
            }
          ]
        }
      },

      variables: {
        event_id: 'test_event_variables',
        event_type: 'form_response',
        form_response: {
          form_id: 'WvM2ejru',
          token: 'test_token_variables',
          landed_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          variables: [
            { key: 'user_id', value: testUserId },
            { key: 'product_id', value: 'incident_report' },
            { key: 'auth_code', value: authCode }
          ],
          answers: [
            {
              field: { id: 'test2', ref: 'incident_location', type: 'short_text' },
              type: 'text',
              text: 'Test Location'
            }
          ]
        }
      },

      answers: {
        event_id: 'test_event_answers',
        event_type: 'form_response',
        form_response: {
          form_id: 'WvM2ejru',
          token: 'test_token_answers',
          landed_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          answers: [
            {
              field: { id: 'user_id_field', ref: 'user_id', type: 'short_text' },
              type: 'text',
              text: testUserId
            },
            {
              field: { id: 'test3', ref: 'vehicle_make', type: 'short_text' },
              type: 'text',
              text: 'Test Vehicle'
            }
          ]
        }
      }
    };

    for (const [format, payload] of Object.entries(payloadFormats)) {
      try {
        this.log('2B', `Testing ${format} extraction method`, { format });

        const response = await axios.post(`${this.baseUrl}/webhook/incident-report`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Typeform-Integration-Test/1.0'
          },
          timeout: 10000
        });

        results[format] = {
          success: response.status === 200,
          responseData: response.data,
          extractedUserId: payload.form_response.hidden?.user_id || 
                          payload.form_response.variables?.find(v => v.key === 'user_id')?.value ||
                          payload.form_response.answers?.find(a => a.field.ref === 'user_id')?.text
        };

        this.log('2C', `✅ ${format} webhook processed`, {
          status: response.status,
          success: response.data.success,
          requestId: response.data.requestId
        });

      } catch (error) {
        results[format] = { success: false, error: error.message };
        this.log('2D', `❌ ${format} webhook error: ${error.message}`);
      }
    }

    return { testUserId, results };
  }

  /**
   * Test 3: Return Journey Flow
   */
  async testReturnJourneyFlow() {
    this.log('3A', 'Testing return journey from Typeform completion');

    const testUserId = this.generateTestUUID();
    const formTypes = ['incident', 'signup'];
    const results = {};

    for (const formType of formTypes) {
      try {
        this.log('3B', `Testing ${formType} return flow`, { userId: testUserId.substring(0, 8) + '...' });

        const returnUrl = `${this.baseUrl}/typeform-complete?user_id=${testUserId}&form_type=${formType}&test_mode=true`;

        const response = await axios.get(returnUrl, {
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400
        });

        results[formType] = {
          success: response.status === 302 || response.status === 200,
          redirectLocation: response.headers.location || response.request.res.responseUrl,
          status: response.status
        };

        this.log('3C', `✅ ${formType} return journey processed`, {
          status: response.status,
          redirectTo: results[formType].redirectLocation
        });

      } catch (error) {
        if (error.response && error.response.status === 302) {
          // Redirect is expected
          results[formType] = {
            success: true,
            redirectLocation: error.response.headers.location,
            status: 302
          };
          this.log('3D', `✅ ${formType} return redirect successful`, {
            redirectTo: error.response.headers.location
          });
        } else {
          results[formType] = { success: false, error: error.message };
          this.log('3E', `❌ ${formType} return journey error: ${error.message}`);
        }
      }
    }

    return { testUserId, results };
  }

  /**
   * Test 4: Database State Checking
   */
  async testDatabaseStateAfterWebhook() {
    this.log('4A', 'Testing database state after webhook processing');

    if (!supabase) {
      this.log('4B', '⚠️ Supabase not configured, skipping database tests');
      return { skipped: true, reason: 'Supabase not configured' };
    }

    const testUserId = this.generateTestUUID();
    const results = {};

    try {
      // Send test webhook
      this.log('4C', 'Sending test webhook to create database entries');

      const testPayload = {
        event_id: 'test_db_check',
        event_type: 'form_response',
        form_response: {
          form_id: 'WvM2ejru',
          token: 'test_db_token',
          landed_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          hidden: {
            user_id: testUserId,
            product_id: 'incident_report',
            auth_code: this.generateAuthCode(testUserId)
          },
          answers: [
            {
              field: { id: 'driver_name', ref: 'driver_name', type: 'short_text' },
              type: 'text',
              text: 'Test Database User'
            },
            {
              field: { id: 'incident_location', ref: 'incident_location', type: 'short_text' },
              type: 'text',
              text: 'Test Database Location'
            }
          ]
        }
      };

      await axios.post(`${this.baseUrl}/webhook/incident-report`, testPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check database tables
      const tablesToCheck = [
        'incident_reports',
        'user_signup',
        'ai_transcription',
        'ai_summary'
      ];

      for (const table of tablesToCheck) {
        try {
          const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact' })
            .eq('create_user_id', testUserId)
            .limit(5);

          results[table] = {
            success: !error,
            recordCount: count || 0,
            hasData: (count || 0) > 0,
            sampleData: data && data.length > 0 ? data[0] : null,
            error: error?.message
          };

          this.log('4D', `${table} check complete`, {
            records: count || 0,
            hasData: (count || 0) > 0,
            error: error?.message
          });

        } catch (tableError) {
          results[table] = {
            success: false,
            error: tableError.message
          };
          this.log('4E', `❌ ${table} check failed: ${tableError.message}`);
        }
      }

    } catch (error) {
      this.log('4F', `❌ Database test setup failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    return { testUserId, results };
  }

  /**
   * Run all tests in sequence
   */
  async runFullIntegrationTest() {
    console.log('\n🚀 STARTING FULL TYPEFORM UUID INTEGRATION TEST');
    console.log('='.repeat(60));

    const startTime = Date.now();
    const fullResults = {
      startTime: new Date().toISOString(),
      tests: {}
    };

    try {
      // Test 1: URL Generation
      fullResults.tests.urlGeneration = await this.testTypeformUrlGeneration();

      // Test 2: Webhook Processing
      fullResults.tests.webhookProcessing = await this.testWebhookUuidExtraction();

      // Test 3: Return Journey
      fullResults.tests.returnJourney = await this.testReturnJourneyFlow();

      // Test 4: Database State
      fullResults.tests.databaseState = await this.testDatabaseStateAfterWebhook();

      const endTime = Date.now();
      const duration = endTime - startTime;

      fullResults.endTime = new Date().toISOString();
      fullResults.duration = duration;
      fullResults.summary = this.generateTestSummary(fullResults.tests);

      console.log('\n📊 INTEGRATION TEST SUMMARY');
      console.log('='.repeat(40));
      console.log(`⏱️  Duration: ${duration}ms`);
      console.log(`✅ Passed: ${fullResults.summary.passed}`);
      console.log(`❌ Failed: ${fullResults.summary.failed}`);
      console.log(`⚠️  Warnings: ${fullResults.summary.warnings}`);

      this.log('FINAL', 'Integration test completed', fullResults.summary);

    } catch (error) {
      this.log('ERROR', `Integration test failed: ${error.message}`);
      fullResults.error = error.message;
    }

    return fullResults;
  }

  /**
   * Generate test summary
   */
  generateTestSummary(tests) {
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    Object.values(tests).forEach(testResult => {
      if (testResult.skipped) {
        warnings++;
      } else if (typeof testResult === 'object') {
        Object.values(testResult.results || testResult).forEach(result => {
          if (result && typeof result === 'object') {
            if (result.success === true) passed++;
            else if (result.success === false) failed++;
            else warnings++;
          }
        });
      }
    });

    return { passed, failed, warnings };
  }

  /**
   * Export test results
   */
  exportResults() {
    return {
      testResults: this.testResults,
      timestamp: new Date().toISOString(),
      environment: {
        baseUrl: this.baseUrl,
        hasSupabase: !!supabase,
        nodeEnv: process.env.NODE_ENV
      }
    };
  }
}

// Export for use in other modules
module.exports = TypeformIntegrationTester;

// CLI execution
if (require.main === module) {
  const tester = new TypeformIntegrationTester();

  if (process.argv.includes('--full')) {
    tester.runFullIntegrationTest()
      .then(results => {
        console.log('\n📁 Full results:', JSON.stringify(results, null, 2));
        process.exit(results.summary.failed > 0 ? 1 : 0);
      })
      .catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
      });
  } else {
    console.log('Typeform Integration Tester loaded.');
    console.log('Usage: node typeform-integration-tester.js --full');
  }
}
