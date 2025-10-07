// ============================================
// ADD THIS TO YOUR index.js (Express server)
// Around line 2450 (after your other API routes)
// ============================================

// what3words API endpoint
app.get('/api/what3words/convert', async (req, res) => {
    try {
        const { lat, lng } = req.query;

        // Validate coordinates
        if (!lat || !lng) {
            return res.status(400).json({ 
                error: 'Missing coordinates',
                message: 'Both lat and lng parameters are required' 
            });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);

        // Validate coordinate ranges
        if (isNaN(latitude) || isNaN(longitude) || 
            latitude < -90 || latitude > 90 || 
            longitude < -180 || longitude > 180) {
            return res.status(400).json({ 
                error: 'Invalid coordinates',
                message: 'Coordinates must be valid latitude (-90 to 90) and longitude (-180 to 180)' 
            });
        }

        // Get what3words API key from environment
        const apiKey = process.env.WHAT3WORDS_API_KEY;
        
        if (!apiKey) {
            console.error('what3words API key not found in environment variables');
            return res.status(500).json({ 
                error: 'Configuration error',
                message: 'what3words API key not configured' 
            });
        }

        // Call what3words API
        const what3wordsUrl = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${latitude},${longitude}&key=${apiKey}`;
        
        const response = await fetch(what3wordsUrl);
        const data = await response.json();

        if (!response.ok) {
            console.error('what3words API error:', data);
            return res.status(response.status).json({ 
                error: 'what3words API error',
                message: data.error?.message || 'Failed to convert coordinates'
            });
        }

        // Return the what3words address and additional info
        res.json({
            success: true,
            words: data.words,
            coordinates: {
                lat: latitude,
                lng: longitude
            },
            nearestPlace: data.nearestPlace || null,
            country: data.country || null,
            language: data.language || 'en',
            map: data.map || null
        });

    } catch (error) {
        console.error('what3words conversion error:', error);
        res.status(500).json({ 
            error: 'Server error',
            message: 'Failed to process location conversion'
        });
    }
});

// ============================================
// OPTIONAL: Get what3words from address
// ============================================
app.get('/api/what3words/autosuggest', async (req, res) => {
    try {
        const { input } = req.query;

        if (!input) {
            return res.status(400).json({ 
                error: 'Missing input',
                message: 'Input parameter is required' 
            });
        }

        const apiKey = process.env.WHAT3WORDS_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ 
                error: 'Configuration error',
                message: 'what3words API key not configured' 
            });
        }

        const what3wordsUrl = `https://api.what3words.com/v3/autosuggest?input=${encodeURIComponent(input)}&key=${apiKey}`;
        
        const response = await fetch(what3wordsUrl);
        const data = await response.json();

        if (!response.ok) {
            console.error('what3words autosuggest error:', data);
            return res.status(response.status).json({ 
                error: 'what3words API error',
                message: data.error?.message || 'Failed to get suggestions'
            });
        }

        res.json({
            success: true,
            suggestions: data.suggestions || []
        });

    } catch (error) {
        console.error('what3words autosuggest error:', error);
        res.status(500).json({ 
            error: 'Server error',
            message: 'Failed to get suggestions'
        });
    }
});

// ============================================
// ENVIRONMENT VARIABLE CHECK
// ============================================
// Add this check when your server starts (in the startup section)

if (!process.env.WHAT3WORDS_API_KEY) {
    console.warn('⚠️  WARNING: WHAT3WORDS_API_KEY not set in environment variables');
    console.warn('   Emergency location services will not work properly');
    console.warn('   Get your API key at: https://what3words.com/select-plan');
}