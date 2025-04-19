// General API errors
export const GENERAL_ERROR_CODES = {
  // Request format errors
  REQUEST_INVALID: 'general_request_invalid',
  REQUEST_VALIDATION_FAILED: 'general_request_validation',
  REQUEST_MISSING_PARAMS: 'general_request_missing_params',

  // Server errors
  SERVER_ERROR: 'general_server_error',
  SERVER_UNAVAILABLE: 'general_server_unavailable',
  SERVER_TIMEOUT: 'general_server_timeout',

  // Database errors
  DATABASE_ERROR: 'general_database_error',
  DATABASE_CONNECTION_FAILED: 'general_database_connection',
  DATABASE_QUERY_FAILED: 'general_database_query',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'general_rate_limit_exceeded',

  // Authentication/Authorization errors (non-OAuth specific)
  AUTH_UNAUTHORIZED: 'general_auth_unauthorized',
  AUTH_FORBIDDEN: 'general_auth_forbidden',
  AUTH_TOKEN_EXPIRED: 'general_auth_token_expired',
  AUTH_TOKEN_INVALID: 'general_auth_token_invalid',
  AUTH_SESSION_EXPIRED: 'general_auth_session_expired',

  // Subscription/Plan errors
  SUBSCRIPTION_REQUIRED: 'general_subscription_required',
  SUBSCRIPTION_EXPIRED: 'general_subscription_expired',
  SUBSCRIPTION_LIMIT_REACHED: 'general_subscription_limit_reached',
  PLAN_FEATURE_UNAVAILABLE: 'general_plan_feature_unavailable',
};

// LLM Service errors
export const LLM_ERROR_CODES = {
  // General LLM errors
  SERVICE_ERROR: 'llm_service_error',
  MODEL_NOT_FOUND: 'llm_model_not_found',
  MODEL_UNAVAILABLE: 'llm_model_unavailable',
  PROMPT_TOO_LONG: 'llm_prompt_too_long',
  CONTEXT_LENGTH_EXCEEDED: 'llm_context_length_exceeded',
  CONTENT_FILTERED: 'llm_content_filtered',

  // Provider-specific errors
  OPENAI_ERROR: 'llm_openai_error',
  ANTHROPIC_ERROR: 'llm_anthropic_error',
  GEMINI_ERROR: 'llm_gemini_error',
  OLLAMA_ERROR: 'llm_ollama_error',

  // Rate limit errors
  RATE_LIMIT_EXCEEDED: 'llm_rate_limit_exceeded',
  TOKEN_LIMIT_EXCEEDED: 'llm_token_limit_exceeded',

  // Configuration errors
  CONFIG_ERROR: 'llm_config_error',
  API_KEY_INVALID: 'llm_api_key_invalid',
  API_KEY_MISSING: 'llm_api_key_missing',
};

// Google service integration errors
export const GOOGLE_ERROR_CODES = {
  // Authentication errors
  AUTH_ERROR: 'google_auth_error',
  AUTH_CANCELLED: 'google_auth_cancelled',
  AUTH_FAILED: 'google_auth_failed',
  AUTH_EXPIRED: 'google_auth_expired',
  AUTH_INVALID_GRANT: 'google_auth_invalid_grant',
  AUTH_INVALID_SCOPE: 'google_auth_invalid_scope',
  AUTH_NOT_FOUND: 'google_auth_not_found',

  // Calendar errors
  CALENDAR_NOT_FOUND: 'google_calendar_not_found',
  CALENDAR_ACCESS_DENIED: 'google_calendar_access_denied',
  CALENDAR_QUOTA_EXCEEDED: 'google_calendar_quota_exceeded',
  CALENDAR_INVALID_REQUEST: 'google_calendar_invalid_request',
  CALENDAR_LIST_FAILED: 'google_calendar_list_failed',

  // Event errors
  EVENT_NOT_FOUND: 'google_event_not_found',
  EVENT_INVALID: 'google_event_invalid',
  EVENT_MISSING_ID: 'google_event_missing_id',
  EVENT_MISSING_FIELDS: 'google_event_missing_fields',
  EVENT_GET_FAILED: 'google_event_get_failed',
  EVENT_LIST_FAILED: 'google_event_list_failed',
  EVENT_CREATE_FAILED: 'google_event_create_failed',
  EVENT_UPDATE_FAILED: 'google_event_update_failed',
  EVENT_DELETE_FAILED: 'google_event_delete_failed',

  // Tasks errors
  TASKS_NOT_FOUND: 'google_tasks_not_found',
  TASKS_ACCESS_DENIED: 'google_tasks_access_denied',
  TASKS_QUOTA_EXCEEDED: 'google_tasks_quota_exceeded',
  TASKS_INVALID_REQUEST: 'google_tasks_invalid_request',
  TASKS_LIST_FAILED: 'google_tasks_list_failed',
  TASKS_DEFAULT_NOT_SET: 'google_tasks_default_not_set',
  TASKLIST_NOT_FOUND: 'google_tasklist_not_found',
  TASKLIST_ID_REQUIRED: 'google_tasklist_id_required',
  TASKLIST_LIST_FAILED: 'google_tasklist_list_failed',
  TASKLIST_CREATE_FAILED: 'google_tasklist_create_failed',
  TASKLIST_DELETE_FAILED: 'google_tasklist_delete_failed',
  TASKLIST_TITLE_REQUIRED: 'google_tasklist_title_required',
  TASK_NOT_FOUND: 'google_task_not_found',
  TASK_ID_REQUIRED: 'google_task_id_required',
  TASK_TITLE_REQUIRED: 'google_task_title_required',
  TASK_CREATE_FAILED: 'google_task_create_failed',
  TASK_UPDATE_FAILED: 'google_task_update_failed',
  TASK_DELETE_FAILED: 'google_task_delete_failed',
};

// Completions API errors
export const COMPLETIONS_ERROR_CODES = {
  NOT_FOUND: 'completions_not_found',
  CREATE_FAILED: 'completions_create_failed',
  UPDATE_FAILED: 'completions_update_failed',
  DELETE_FAILED: 'completions_delete_failed',
  INVALID_FORMAT: 'completions_invalid_format',
  STORAGE_ERROR: 'completions_storage_error',
};

// Notes API errors
export const NOTES_ERROR_CODES = {
  NOT_FOUND: 'notes_not_found',
  CREATE_FAILED: 'notes_create_failed',
  UPDATE_FAILED: 'notes_update_failed',
  DELETE_FAILED: 'notes_delete_failed',
  LIMIT_REACHED: 'notes_limit_reached',

  TAG_INVALID: 'notes_tag_invalid',
  TAG_LIMIT_REACHED: 'notes_tag_limit_reached',

  ATTACHMENT_UPLOAD_FAILED: 'notes_attachment_upload_failed',
  ATTACHMENT_DOWNLOAD_FAILED: 'notes_attachment_download_failed',
  ATTACHMENT_DELETE_FAILED: 'notes_attachment_delete_failed',
  ATTACHMENT_LIMIT_REACHED: 'notes_attachment_limit_reached',
  ATTACHMENT_SIZE_EXCEEDED: 'notes_attachment_size_exceeded',
  ATTACHMENT_TYPE_INVALID: 'notes_attachment_type_invalid',
};

// User preferences errors
export const USER_PREFERENCES_ERROR_CODES = {
  NOT_FOUND: 'user_preferences_not_found',
  UPDATE_FAILED: 'user_preferences_update_failed',
  INVALID_FORMAT: 'user_preferences_invalid_format',
};

// most commonly used error codes, need to guide users to resolve them
export const essentialErrorCodes = [
  GENERAL_ERROR_CODES.AUTH_UNAUTHORIZED,
  GENERAL_ERROR_CODES.SERVER_ERROR,
  GOOGLE_ERROR_CODES.AUTH_NOT_FOUND,
];
