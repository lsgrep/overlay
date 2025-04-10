import { chromeStorageKeys } from './supabase';

// Completion interfaces
export interface CompletionMetadata {
  images?: Array<{ url: string; original_url?: string }>;
  [key: string]: unknown;
}

export interface CompletionData {
  completion_id?: string;
  uid?: string;
  prompt_content: string;
  response_content: string;
  source_url?: string | null;
  prompt_timestamp?: string | null;
  response_timestamp?: string | null;
  model_name?: string | null;
  model_provider?: string | null;
  model_display_name?: string | null;
  question_id?: string | null;
  mode?: string | null;
  metadata?: CompletionMetadata | null;
  is_public?: boolean;
}

export interface CompletionResponse {
  success: boolean;
  completion: CompletionData;
  message: string;
}

// Base URL for Overlay API
const OVERLAY_API_BASE_URL = 'https://overlay.one/api';
// const OVERLAY_API_BASE_URL = 'http://localhost:3000/api';

// Task interfaces
export interface TaskList {
  id: string;
  title: string;
  updated?: string;
  selfLink?: string;
}

export interface Task {
  id: string;
  taskId: string;
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
  status?: 'completed' | 'needsAction';
  title?: string;
  notes?: string;
  due?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'accepted' | 'tentative' | 'declined' | 'needsAction';
  }>;
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
   * Get all task lists for the authenticated user
   * @returns An array of task list objects
   */
  async getTaskLists(): Promise<TaskList[]> {
    const response = await makeAuthenticatedRequest<{ taskLists: TaskList[] }>('/tasks/lists');
    return response.taskLists || [];
  },

  /**
   * Get tasks from a specified list or the default list
   * @param listId The ID of the task list to fetch tasks from (optional, uses default if not provided)
   * @returns An array of task objects
   */
  async getTasks(listId: string | undefined) {
    // Add cache busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const path = listId ? `/tasks?listId=${listId}&${cacheBuster}` : `/tasks?${cacheBuster}`;
    const response = await makeAuthenticatedRequest<{ tasks: Task[] }>(path);
    return response.tasks || [];
  },

  /**
   * Create a new task
   * @param taskData Data for the new task
   */
  async createTask(taskData: CreateTaskData) {
    return makeAuthenticatedRequest<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        listId: taskData.listId,
        title: taskData.title,
        notes: taskData.notes,
        due: taskData.due ? new Date(taskData.due).toISOString() : undefined,
      }),
    });
  },

  /**
   * Update a task's details
   * @param taskId The ID of the task to update
   * @param taskData The new task data
   * @param listId The ID of the list containing the task (optional, uses default if not provided)
   */
  async updateTask(taskId: string, taskData: Partial<Task>, listId: string) {
    // Make sure we're using the correct task ID field
    // The API uses 'taskId' field from the Task object for the actual Google Tasks API ID
    const actualTaskIdToUse = taskData.taskId || taskId;

    // Create payload with required fields
    const payload = {
      ...taskData,
      taskId: actualTaskIdToUse,
      listId: listId, // Include listId in the request body
    };

    console.log('Sending task update with data:', payload);

    return makeAuthenticatedRequest<Task>(`/tasks?listId=${listId}&taskId=${actualTaskIdToUse}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete a task
   * @param taskId The ID of the task to delete
   * @param listId The ID of the list containing the task
   */
  async deleteTask(taskId: string, listId: string) {
    // Include task info in the query parameters and also send listId in the request body for consistency
    return makeAuthenticatedRequest<void>(`/tasks?listId=${listId}&taskId=${taskId}`, {
      method: 'DELETE',
      body: JSON.stringify({
        taskId,
        listId,
      }),
    });
  },

  /**
   * Get calendar events within a specified date range
   * @param startDate Start date in ISO format
   * @param endDate End date in ISO format
   * @returns An array of calendar event objects
   */
  async getCalendarEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    try {
      const response = await makeAuthenticatedRequest<{ events: CalendarEvent[] }>(
        `/events?start=${startDate}&end=${endDate}`,
      );
      return response.events || [];
    } catch (error) {
      console.error('[API] Error fetching calendar events:', error);
      return [];
    }
  },

  /**
   * Fetch upcoming calendar events
   * @param days Number of days to look ahead (default: 7)
   * @returns An array of upcoming calendar events
   */
  async getUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
    try {
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + days);

      return this.getCalendarEvents(today.toISOString(), endDate.toISOString());
    } catch (error) {
      console.error('[API] Error fetching upcoming events:', error);
      return [];
    }
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
   * Format date and time for an event
   * @param dateTimeString DateTime string in ISO format
   * @returns Formatted date and time strings
   */
  formatEventDateTime(dateTime?: string, dateOnly?: string): { date: string; time: string; isAllDay: boolean } {
    if (!dateTime && !dateOnly) {
      return { date: '', time: '', isAllDay: false };
    }

    const date = dateTime ? new Date(dateTime) : new Date(dateOnly!);
    const isAllDay = !dateTime;

    return {
      date: date.toLocaleDateString(),
      time: isAllDay ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAllDay,
    };
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

  /**
   * Save a completion with image processing support
   * @param completionData The completion data to save
   * @returns The saved completion information
   */
  async createCompletion(completionData: CompletionData): Promise<CompletionResponse> {
    return makeAuthenticatedRequest<CompletionResponse>('/completions', {
      method: 'POST',
      body: JSON.stringify(completionData),
    });
  },

  /**
   * Get user preferences including theme, default task list, etc.
   * @returns User preferences with success status and preference data
   */
  async getUserPreferences() {
    try {
      const { getUserPreferences } = await import('./supabase');
      return getUserPreferences();
    } catch (error) {
      console.error('[API] Error getting user preferences:', error);
      return { success: false, error: (error as Error).message, data: null };
    }
  },
};
