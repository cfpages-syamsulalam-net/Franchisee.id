/**
 * API Client for the Debug Toolkit Viewer
 *
 * Handles CSRF token management and API requests with proper error handling
 */

// Store for the CSRF token
let csrfToken = "";

/**
 * Initialize the CSRF token by fetching from the API
 *
 * @returns {Promise<boolean>} Whether initialization succeeded
 */
export async function initCsrfToken() {
  try {
    const response = await fetch("api.php?action=get_csrf_token");

    if (!response.ok) {
      return false;
    }

    const data = await response.json();

    if (data.success && data.data && data.data.token) {
      csrfToken = data.data.token;
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Make an API request with proper CSRF protection
 *
 * @param {string} action The API action to call
 * @param {string} method The HTTP method (GET, POST, etc.)
 * @param {Object|FormData|null} data Optional data to send with the request
 * @returns {Promise<Object>} The API response
 */
export async function apiRequest(action, method = "GET", data = null) {
  const url = `api.php?action=${action}`;
  const options = {
    method,
    headers: {},
    credentials: "same-origin", // Include cookies in the request
  };

  // Add CSRF token to header for all non-GET requests
  if (method !== "GET" && csrfToken) {
    options.headers["X-CSRF-Token"] = csrfToken;

    // For POST requests, we also include the token in the URL as a fallback
    if (method === "POST") {
      const tokenParam = `&csrf_token=${encodeURIComponent(csrfToken)}`;
      return fetch(`${url}${tokenParam}`, options)
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `API request failed with status: ${response.status}`,
            );
          }
          return response.json();
        })
        .catch((error) => {
          throw error;
        });
    }
  }

  // Handle request body for different data types
  if (data && method !== "GET") {
    if (data instanceof FormData) {
      // For FormData, append the token
      data.append("csrf_token", csrfToken);
      options.body = data;
    } else {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify({
        ...data,
        csrf_token: csrfToken,
      });
    }
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `API request failed with status: ${response.status}`,
      );
    }

    // Handle different response formats
    if (action === "get_logs") {
      // Special case for get_logs which has a different response format
      return response.json();
    }

    const result = await response.json();

    // Check for API error
    if (!result.success && result.error) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error(error);
  }
}

/**
 * Clear logs
 *
 * @returns {Promise<boolean>} Whether the operation succeeded
 */
export async function clearLogs() {
  try {
    await apiRequest("clear_logs", "POST");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get file content
 *
 * @param {string} file File path
 * @param {number} line Line number
 * @param {string} logEntry Original log entry
 * @returns {Promise<Object>} File content data
 */
export async function getFileContent(file, line, logEntry = null) {
  const queryParams = new URLSearchParams({
    file,
    line: line.toString(),
  });

  if (logEntry) {
    queryParams.append("log_entry", logEntry);
  }

  const response = await fetch(
    `api.php?action=get_file_content&${queryParams.toString()}`,
  );
  return await response.json();
}

/**
 * Get modules status
 *
 * @returns {Promise<Object>} Status of plugins and themes
 */
export async function getModulesStatus() {
  try {
    const result = await apiRequest("get_modules_status");
    return result.data || {};
  } catch (error) {
    return {};
  }
}

/**
 * Toggle plugins
 *
 * @param {boolean} enable Whether to enable or disable plugins
 * @returns {Promise<boolean>} Whether the operation succeeded
 */
export async function togglePlugins(enable) {
  try {
    const action = enable ? "enable_plugins" : "disable_plugins";
    await apiRequest(action, "POST");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Toggle themes
 *
 * @param {boolean} enable Whether to enable or disable themes
 * @returns {Promise<boolean>} Whether the operation succeeded
 */
export async function toggleThemes(enable) {
  try {
    const action = enable ? "enable_themes" : "disable_themes";
    await apiRequest(action, "POST");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Authenticate with password
 *
 * @param {string} password The password to authenticate with
 * @returns {Promise<boolean>} Whether authentication succeeded
 */
export async function authenticate(password) {
  try {
    // Using FormData for authentication to avoid exposing password in URL
    const formData = new FormData();
    formData.append("password", password);

    const result = await fetch("api.php?action=authenticate", {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    }).then((response) => response.json());

    return result.success && result.data && result.data.authenticated;
  } catch (error) {
    return false;
  }
}
