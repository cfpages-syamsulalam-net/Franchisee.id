const AnalyticsWP = (function () {
    // Private functions and properties

    function sendAnalyticsData(event_type, data, event_properties = {}) {
        const ajaxurl = analyticswp_vars.ajaxurl;
        fetch(ajaxurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                action: 'analyticswp_send_analytics',
                // nonce: analyticswp_vars.nonce, // TODO This is the nonce we'll verify on the server side for security
                event_type: event_type,
                analyticsData: JSON.stringify(data), // Convert the data object to a JSON string
                eventProperties: JSON.stringify(event_properties), // Convert the event_properties object to a JSON string
            })
        })
        .then(response => response.json())
    }

    function getDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.match(/tablet|ipad|playbook|silk/)) {
            return 'tablet';
        } else if (userAgent.match(/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/)) {
            return 'mobile';
        } else {
            return 'desktop';
        }
    }

    function getQueryParameters() {
        const params = {};
        new URLSearchParams(window.location.search).forEach((value, key) => {
            params[key] = value;
        });
        return params;
    }
    

    function gatherAnalyticsData() {
        const deviceType = getDeviceType();
        const queryParams = getQueryParameters();

        return {
            // pageTitle: document.title,
            pageURL: window.location.href,
            referrer: document.referrer,
            deviceType: deviceType,
            userAgent: navigator.userAgent,
            // language: navigator.language || navigator.userLanguage,
            // platform: navigator.platform,
            // screenHeight: window.screen.height,
            // screenWidth: window.screen.width,
            // screenColorDepth: window.screen.colorDepth,
            // viewportWidth: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
            // viewportHeight: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0),
            // queryParams: queryParams,
            utmSource: queryParams['utm_source'] || null,
            utmMedium: queryParams['utm_medium'] || null,
            utmCampaign: queryParams['utm_campaign'] || null,
            utmTerm: queryParams['utm_term'] || null,
            utmContent: queryParams['utm_content'] || null,
            timestamp: new Date().toISOString()
        };
    }

    function generateUniqueSessionID() {
        // Check if the crypto object and randomUUID method are available
        if (window.crypto && crypto.randomUUID) {
            return crypto.randomUUID();
        } else {
            // Fallback method for non-secure contexts
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0,
                    v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }

    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function getUniqueSessionID() {

        let uniqueSessionID;

        try {
            uniqueSessionID = localStorage.getItem('unique_session_id');
        } catch (e) {
        }

        if (!uniqueSessionID) {
            uniqueSessionID = getCookie('unique_session_id');
        }

        if (!uniqueSessionID) {
            uniqueSessionID = generateUniqueSessionID();

            try {
                localStorage.setItem('unique_session_id', uniqueSessionID);
            } catch (e) {
            }

            setCookie('unique_session_id', uniqueSessionID, 365); // Setting the cookie to expire in 365 days
        }

        return uniqueSessionID;
    }

    // Public methods and properties
    return {
        init: function () {
            document.addEventListener("DOMContentLoaded", function () {
                AnalyticsWP.pageview();
            });
        },
        pageview: function () {
            const data = this.getAnalyticsData();
            sendAnalyticsData('pageview', data);
        },
        event: function (event_type, event_properties) {
            // ensure that event_type is a non-empty string
            if (typeof event_type !== 'string' || !event_type.trim()) {
                return;
            }

            // ensure that event_properties is an object
            if (typeof event_properties !== 'object') {
                event_properties = {};
            }

            const data = this.getAnalyticsData();

            // TODO do something with the event_properties object
            sendAnalyticsData(event_type, data, event_properties);
        },
        getAnalyticsData: function () {
            const data = gatherAnalyticsData();
            data.unique_session_id = getUniqueSessionID();
            return data;
        },
    };
})();

// Usage
AnalyticsWP.init();
