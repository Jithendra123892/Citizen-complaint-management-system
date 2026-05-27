/**
 * CitizenConnect - Shared Configuration
 * Loaded first on every page. Provides APP_CONFIG for all scripts.
 */
(function() {
    'use strict';

    var apiBase;
    // Allow explicit override via data attribute: <script id="app-config" data-api-url="http://...">
    var configEl = document.getElementById('app-config');
    if (configEl && configEl.dataset.apiUrl) {
        apiBase = configEl.dataset.apiUrl;
    } else {
        // Derive from current page location: works for all web-suite pages
        var loc = window.location;
        var port = loc.port === '5000' ? '5000' : '5000';
        apiBase = loc.protocol + '//' + loc.hostname + ':' + port + '/api';
    }

    window.APP_CONFIG = {
        API_BASE_URL: apiBase,
        VERSION: '1.0.0',
        APP_NAME: 'CitizenConnect',
        GOV_TAG: 'Government of India'
    };

    // Also expose API_BASE globally for scripts that need it without window.APP_CONFIG
    window.API_BASE = apiBase;
})();