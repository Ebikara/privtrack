/**
 * PrivTrack – Privacy & Compliance Tracker
 * Vanilla JavaScript Implementation
 */

// ============================================================================
// Constants and Application State
// ============================================================================
const STORAGE_KEY = 'privtrack_compliance_activities';

// In-memory application state
let activities = [];
let editingActivityId = null;
let isSubmitting = false;

// ============================================================================
// DOM Element Selectors
// ============================================================================
let activityForm;
let activityIdInput;
let activityNameInput;
let organizationInput;
let statusSelect;
let submitBtn;
let submitBtnText;
let cancelEditBtn;
let formHeading;
let validationMessage;

let totalCountEl;
let pendingCountEl;
let inProgressCountEl;
let completedCountEl;

let searchInput;
let clearSearchBtn;
let activitiesTable;
let activitiesTbody;
let emptyStateEl;
let emptyStateMessageEl;

// ============================================================================
// Initialization
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Cache DOM elements
  activityForm = document.getElementById('activity-form');
  activityIdInput = document.getElementById('activity-id');
  activityNameInput = document.getElementById('activity-name');
  organizationInput = document.getElementById('organization');
  statusSelect = document.getElementById('status');
  submitBtn = document.getElementById('submit-btn');
  submitBtnText = document.getElementById('submit-btn-text');
  cancelEditBtn = document.getElementById('cancel-edit-btn');
  formHeading = document.getElementById('form-heading');
  validationMessage = document.getElementById('validation-message');

  totalCountEl = document.getElementById('total-count');
  pendingCountEl = document.getElementById('pending-count');
  inProgressCountEl = document.getElementById('in-progress-count');
  completedCountEl = document.getElementById('completed-count');

  searchInput = document.getElementById('search-input');
  clearSearchBtn = document.getElementById('clear-search-btn');
  activitiesTable = document.getElementById('activities-table');
  activitiesTbody = document.getElementById('activities-tbody');
  emptyStateEl = document.getElementById('empty-state');
  emptyStateMessageEl = document.getElementById('empty-state-message');

  // Load activities from localStorage
  activities = loadActivities();

  // Attach event listeners
  setupEventListeners();

  // Initial render of dashboard summary and activity list
  updateDashboardSummary();
  renderActivities();
});

// ============================================================================
// Event Listeners Setup
// ============================================================================
function setupEventListeners() {
  // Form submission (Add or Update)
  activityForm.addEventListener('submit', handleFormSubmit);

  // Cancel edit button
  cancelEditBtn.addEventListener('click', cancelEditing);

  // Search input: filter in real-time as user types
  searchInput.addEventListener('input', handleSearchInput);

  // Clear search button
  clearSearchBtn.addEventListener('click', handleClearSearch);

  // Real-time validation clearance on input
  activityNameInput.addEventListener('input', clearValidationMessage);
  organizationInput.addEventListener('input', clearValidationMessage);
}

// ============================================================================
// Data Persistence (localStorage)
// ============================================================================

/**
 * Loads compliance activities from localStorage.
 * Handles corrupt data or empty storage gracefully.
 * @returns {Array} Array of activity objects
 */
function loadActivities() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      return [];
    }
    const parsedData = JSON.parse(rawData);
    // Ensure the parsed result is a valid array
    if (Array.isArray(parsedData)) {
      return parsedData;
    }
    return [];
  } catch (error) {
    console.error('Failed to load activities from localStorage:', error);
    return [];
  }
}

/**
 * Persists the current activities array to localStorage.
 */
function saveActivities() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  } catch (error) {
    console.error('Failed to save activities to localStorage:', error);
    showValidationMessage('Unable to save changes to browser storage. Your storage might be full.');
  }
}

// ============================================================================
// Dashboard Summary Statistics
// ============================================================================

/**
 * Recalculates and updates the 4 dashboard summary cards.
 * Runs on every add, edit, and delete.
 */
function updateDashboardSummary() {
  const total = activities.length;
  let pending = 0;
  let inProgress = 0;
  let completed = 0;

  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];
    if (act.status === 'Pending') {
      pending++;
    } else if (act.status === 'In Progress') {
      inProgress++;
    } else if (act.status === 'Completed') {
      completed++;
    }
  }

  // Update DOM counts
  totalCountEl.textContent = total;
  pendingCountEl.textContent = pending;
  inProgressCountEl.textContent = inProgress;
  completedCountEl.textContent = completed;
}

// ============================================================================
// Form Handling (Add & Edit)
// ============================================================================

/**
 * Handles form submission for both adding new activities and updating existing ones.
 * @param {Event} event
 */
function handleFormSubmit(event) {
  event.preventDefault();

  // Prevent accidental rapid duplicate clicks
  if (isSubmitting) return;

  const nameValue = activityNameInput.value.trim();
  const orgValue = organizationInput.value.trim();
  const statusValue = statusSelect.value;

  // Validation: do not allow empty fields
  if (!nameValue && !orgValue) {
    showValidationMessage('Please enter an Activity Name and Organization.');
    activityNameInput.focus();
    return;
  }
  if (!nameValue) {
    showValidationMessage('Please enter an Activity Name.');
    activityNameInput.focus();
    return;
  }
  if (!orgValue) {
    showValidationMessage('Please enter an Organization name.');
    organizationInput.focus();
    return;
  }

  // Temporary submission lock to prevent duplicate clicks
  isSubmitting = true;

  if (editingActivityId) {
    // --- EDIT MODE ---
    const targetIndex = activities.findIndex(item => item.id === editingActivityId);
    if (targetIndex !== -1) {
      activities[targetIndex].name = nameValue;
      activities[targetIndex].organization = orgValue;
      activities[targetIndex].status = statusValue;
      activities[targetIndex].updatedAt = new Date().toISOString();
    }
  } else {
    // --- ADD MODE ---
    const newActivity = {
      id: generateUniqueId(),
      name: nameValue,
      organization: orgValue,
      status: statusValue,
      createdAt: new Date().toISOString()
    };
    // Add to the beginning of the list for immediate visibility
    activities.unshift(newActivity);
  }

  // Persist to storage and refresh UI
  saveActivities();
  updateDashboardSummary();
  renderActivities();

  // Reset form back to Add mode
  resetForm();

  // Release submission lock
  setTimeout(() => {
    isSubmitting = false;
  }, 200);
}

/**
 * Prepares the form to edit an existing activity.
 * @param {string} id - The unique ID of the activity to edit
 */
function startEditing(id) {
  const activity = activities.find(item => item.id === id);
  if (!activity) return;

  editingActivityId = id;
  activityIdInput.value = activity.id;
  activityNameInput.value = activity.name;
  organizationInput.value = activity.organization;
  statusSelect.value = activity.status;

  // Change form header and button state
  formHeading.textContent = 'Edit Compliance Activity';
  submitBtnText.textContent = 'Update Activity';
  cancelEditBtn.classList.remove('hidden');

  clearValidationMessage();

  // Scroll form into view smoothly on mobile/tablet screens
  activityForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  activityNameInput.focus();
}

/**
 * Cancels editing mode and resets the form back to Add mode.
 */
function cancelEditing() {
  resetForm();
}

/**
 * Resets the form to its initial Add Activity state.
 */
function resetForm() {
  editingActivityId = null;
  activityIdInput.value = '';
  activityForm.reset();
  statusSelect.value = 'Pending';

  formHeading.textContent = 'Add Compliance Activity';
  submitBtnText.textContent = 'Add Activity';
  cancelEditBtn.classList.add('hidden');

  clearValidationMessage();
}

/**
 * Displays a friendly validation error message.
 * @param {string} message
 */
function showValidationMessage(message) {
  validationMessage.textContent = message;
  validationMessage.classList.remove('hidden');
}

/**
 * Clears and hides the validation message.
 */
function clearValidationMessage() {
  validationMessage.textContent = '';
  validationMessage.classList.add('hidden');
}

// ============================================================================
// Delete Activity
// ============================================================================

/**
 * Deletes an activity after user confirmation.
 * @param {string} id - Unique ID of the activity
 */
function deleteActivity(id) {
  const confirmed = window.confirm('Are you sure you want to delete this activity?');
  if (!confirmed) {
    return;
  }

  // If the activity being deleted is currently loaded in the edit form, reset the form
  if (editingActivityId === id) {
    resetForm();
  }

  // Filter out the activity by its unique ID
  activities = activities.filter(activity => activity.id !== id);

  // Persist changes and update UI immediately
  saveActivities();
  updateDashboardSummary();
  renderActivities();
}

// ============================================================================
// Search Functionality
// ============================================================================

/**
 * Handles real-time search filtering.
 */
function handleSearchInput() {
  const query = searchInput.value.trim();
  if (query) {
    clearSearchBtn.classList.remove('hidden');
  } else {
    clearSearchBtn.classList.add('hidden');
  }
  renderActivities();
}

/**
 * Clears search input and re-renders full list.
 */
function handleClearSearch() {
  searchInput.value = '';
  clearSearchBtn.classList.add('hidden');
  searchInput.focus();
  renderActivities();
}

// ============================================================================
// Render Activities List / Table
// ============================================================================

/**
 * Renders the activities table or displays appropriate empty state.
 */
function renderActivities() {
  const query = searchInput.value.trim().toLowerCase();

  // Filter activities based on name or organization
  const filteredActivities = activities.filter(activity => {
    if (!query) return true;
    const nameMatch = activity.name.toLowerCase().includes(query);
    const orgMatch = activity.organization.toLowerCase().includes(query);
    return nameMatch || orgMatch;
  });

  // Clear existing table rows
  activitiesTbody.innerHTML = '';

  // Case 1: No activities stored at all
  if (activities.length === 0) {
    activitiesTable.classList.add('hidden');
    emptyStateEl.classList.remove('hidden');
    emptyStateMessageEl.textContent = 'No compliance activities yet. Add your first activity to get started.';
    return;
  }

  // Case 2: Activities exist, but none match the search query
  if (filteredActivities.length === 0) {
    activitiesTable.classList.add('hidden');
    emptyStateEl.classList.remove('hidden');
    emptyStateMessageEl.textContent = `No matching compliance activities found for "${searchInput.value.trim()}".`;
    return;
  }

  // Case 3: Activities found — render rows
  activitiesTable.classList.remove('hidden');
  emptyStateEl.classList.add('hidden');

  filteredActivities.forEach(activity => {
    const row = document.createElement('tr');

    // 1. Activity Name Cell
    const nameCell = document.createElement('td');
    nameCell.setAttribute('data-label', 'Activity Name');
    nameCell.className = 'activity-name-cell';
    nameCell.textContent = activity.name;
    row.appendChild(nameCell);

    // 2. Organization Cell
    const orgCell = document.createElement('td');
    orgCell.setAttribute('data-label', 'Organization');
    orgCell.className = 'org-cell';
    orgCell.textContent = activity.organization;
    row.appendChild(orgCell);

    // 3. Status Cell
    const statusCell = document.createElement('td');
    statusCell.setAttribute('data-label', 'Status');
    statusCell.className = 'status-cell';

    const badge = document.createElement('span');
    badge.className = `status-badge ${getStatusBadgeClass(activity.status)}`;

    const dot = document.createElement('span');
    dot.className = 'status-dot';
    dot.setAttribute('aria-hidden', 'true');

    const badgeText = document.createTextNode(activity.status);

    badge.appendChild(dot);
    badge.appendChild(badgeText);
    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    // 4. Actions Cell (Edit and Delete buttons)
    const actionsCell = document.createElement('td');
    actionsCell.setAttribute('data-label', 'Actions');
    actionsCell.className = 'cell-actions';

    const actionWrapper = document.createElement('div');
    actionWrapper.className = 'action-buttons';

    // Edit Button
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'action-btn edit-btn';
    editBtn.setAttribute('aria-label', `Edit ${activity.name}`);
    editBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
      <span>Edit</span>
    `;
    editBtn.addEventListener('click', () => startEditing(activity.id));

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'action-btn delete-btn';
    deleteBtn.setAttribute('aria-label', `Delete ${activity.name}`);
    deleteBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
      <span>Delete</span>
    `;
    deleteBtn.addEventListener('click', () => deleteActivity(activity.id));

    actionWrapper.appendChild(editBtn);
    actionWrapper.appendChild(deleteBtn);
    actionsCell.appendChild(actionWrapper);
    row.appendChild(actionsCell);

    activitiesTbody.appendChild(row);
  });
}

/**
 * Returns the CSS class for status badges.
 * @param {string} status
 * @returns {string}
 */
function getStatusBadgeClass(status) {
  switch (status) {
    case 'Pending':
      return 'status-pending';
    case 'In Progress':
      return 'status-in-progress';
    case 'Completed':
      return 'status-completed';
    default:
      return 'status-pending';
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generates a unique, collision-resistant identifier for activities.
 * @returns {string}
 */
function generateUniqueId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `act_${timestamp}_${randomPart}`;
}

