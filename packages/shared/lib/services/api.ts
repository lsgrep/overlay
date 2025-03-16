import { chromeStorageKeys } from './supabase';

// Base URL for Overlay API
const OVERLAY_API_BASE_URL = 'https://overlay.one/api';

// Default task list ID
const DEFAULT_TASK_LIST_ID = 'MDU1MjgyMTk4ODAzMTg5NDI3MjA6MDow';

// Task interfaces
export interface Task {
  id: string;
  title: string;
  notes?: string;
  status?: string;
  due?: string;
  listId?: string;
}

export interface CreateTaskData {
  listId?: string;
  title: string;
  notes?: string;
  due?: string;
}

export interface UpdateTaskData {
  listId?: string;
  taskId: string;
  status: 'completed' | 'needsAction';
}

/**
 * Get authentication headers for API requests using the stored Supabase tokens
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  // Get the access token from Chrome storage
  const accessToken = await getLocalStorage(chromeStorageKeys.supabaseAccessToken);

  if (!accessToken) {
    console.error('[API] No access token found in storage, cannot authenticate request');
    throw new Error('Authentication required. Please sign in first.');
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Get a value from Chrome local storage
 */
async function getLocalStorage(key: string): Promise<string | null> {
  return new Promise(resolve => {
    chrome.storage.local.get([key], result => {
      resolve(result[key] || null);
    });
  });
}

/**
 * Make an authenticated request to the Overlay API
 */
async function makeAuthenticatedRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${OVERLAY_API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        ...headers,
      },
    });

    if (!response.ok) {
      // Handle common error cases
      if (response.status === 401) {
        throw new Error('Authentication failed. Please sign in again.');
      }

      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `API request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[API] Request failed:', error);
    throw error;
  }
}

/**
 * API client for Overlay services
 */
export const overlayApi = {
  /**
   * Get tasks from a specified list or the default list
   * @param listId The ID of the task list to fetch tasks from (optional, uses default if not provided)
   * @returns An array of task objects
   */
  async getTasks(listId: string = DEFAULT_TASK_LIST_ID) {
    const response = await makeAuthenticatedRequest<{ tasks: Task[] }>(`/tasks?listId=${listId}`);
    return response.tasks || [];
  },

  /**
   * Get a specific task by ID
   * @param taskId The ID of the task to retrieve
   * @param listId The ID of the list containing the task (optional, uses default if not provided)
   */
  async getTaskById(taskId: string, listId: string = DEFAULT_TASK_LIST_ID) {
    return makeAuthenticatedRequest<Task>(`/tasks/${taskId}?listId=${listId}`);
  },

  /**
   * Create a new task
   * @param taskData Data for the new task
   */
  async createTask(taskData: CreateTaskData) {
    return makeAuthenticatedRequest<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        listId: taskData.listId || DEFAULT_TASK_LIST_ID,
        title: taskData.title,
        notes: taskData.notes,
        due: taskData.due ? new Date(taskData.due).toISOString() : undefined,
      }),
    });
  },

  /**
   * Update a task's status (mark as complete/incomplete)
   * @param data The task update data
   */
  async updateTaskStatus(data: UpdateTaskData) {
    return makeAuthenticatedRequest<Task>('/tasks', {
      method: 'PATCH',
      body: JSON.stringify({
        listId: data.listId || DEFAULT_TASK_LIST_ID,
        taskId: data.taskId,
        status: data.status,
      }),
    });
  },

  /**
   * Update a task's details
   * @param taskId The ID of the task to update
   * @param taskData The new task data
   * @param listId The ID of the list containing the task (optional, uses default if not provided)
   */
  async updateTask(taskId: string, taskData: Partial<Task>, listId: string = DEFAULT_TASK_LIST_ID) {
    return makeAuthenticatedRequest<Task>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({
        listId,
        ...taskData,
      }),
    });
  },

  /**
   * Delete a task
   * @param taskId The ID of the task to delete
   * @param listId The ID of the list containing the task (optional, uses default if not provided)
   */
  async deleteTask(taskId: string, listId: string = DEFAULT_TASK_LIST_ID) {
    return makeAuthenticatedRequest<void>(`/tasks/${taskId}?listId=${listId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Format a date for display
   * @param dateString Date string to format
   */
  formatDate(dateString?: string | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  },

  /**
   * Check the user's authentication status
   * Returns true if authenticated, false otherwise
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const accessToken = await getLocalStorage(chromeStorageKeys.supabaseAccessToken);
      return !!accessToken;
    } catch (error) {
      console.error('[API] Error checking authentication status:', error);
      return false;
    }
  },
};
