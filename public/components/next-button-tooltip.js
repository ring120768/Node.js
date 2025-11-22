/**
 * Next Button Tooltip Component
 *
 * Dynamically shows users what they need to complete before clicking Next
 * Updates in real-time as users fill in form fields
 *
 * Usage:
 * 1. Include CSS: <link rel="stylesheet" href="/components/next-button-tooltip.css">
 * 2. Include this script
 * 3. Call initNextButtonTooltip(validateFormFunction, getValidationMessagesFunction)
 *
 * Example:
 * initNextButtonTooltip(
 *   () => validateForm(),  // Returns true/false
 *   () => getValidationMessages()  // Returns { complete: boolean, messages: string[] }
 * );
 */

/**
 * Initialize the next button tooltip
 * @param {Function} validateFormFn - Function that returns true if form is valid
 * @param {Function} getMessagesFn - Function that returns { complete: boolean, messages: string[] }
 */
function initNextButtonTooltip(validateFormFn, getMessagesFn) {
  const nextBtn = document.getElementById('nextBtn');
  if (!nextBtn) {
    console.warn('Next button not found - tooltip initialization skipped');
    return;
  }

  // Wrap button if not already wrapped
  let wrapper = nextBtn.closest('.next-btn-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'next-btn-wrapper';
    nextBtn.parentNode.insertBefore(wrapper, nextBtn);
    wrapper.appendChild(nextBtn);
  }

  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'next-btn-tooltip';
  tooltip.innerHTML = `
    <div class="tooltip-header">
      <span class="tooltip-icon">💡</span>
      <span class="tooltip-title">Pro Tip</span>
    </div>
    <div class="tooltip-content">
      <div class="tooltip-message"></div>
    </div>
  `;
  wrapper.appendChild(tooltip);

  // Update tooltip content
  function updateTooltip() {
    const result = getMessagesFn();
    const header = tooltip.querySelector('.tooltip-header');
    const icon = tooltip.querySelector('.tooltip-icon');
    const title = tooltip.querySelector('.tooltip-title');
    const message = tooltip.querySelector('.tooltip-message');

    if (result.complete) {
      // Form is complete
      header.className = 'tooltip-header complete';
      icon.textContent = '✅';
      title.textContent = 'All Set!';
      message.innerHTML = '<div class="tooltip-success">All required fields completed. Click to continue!</div>';
    } else {
      // Form has missing fields
      header.className = 'tooltip-header incomplete';
      icon.textContent = '⚠️';
      title.textContent = 'Complete These First';

      if (result.messages && result.messages.length > 0) {
        message.innerHTML = `
          <div>Please complete the following:</div>
          <ul class="missing-fields-list">
            ${result.messages.map(msg => `<li>${msg}</li>`).join('')}
          </ul>
        `;
      } else {
        message.innerHTML = '<div>Some required fields are missing.</div>';
      }
    }

    // Add pulse animation to icon
    icon.classList.add('pulse');
    setTimeout(() => icon.classList.remove('pulse'), 300);
  }

  // Update on page load
  updateTooltip();

  // Update when any form field changes
  const formElements = document.querySelectorAll('input, select, textarea');
  formElements.forEach(element => {
    element.addEventListener('change', updateTooltip);
    element.addEventListener('input', updateTooltip);
  });

  // Also update when checkboxes/radio buttons are clicked
  const checkboxes = document.querySelectorAll('input[type="checkbox"], input[type="radio"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('click', () => {
      // Slight delay to let the change event fire first
      setTimeout(updateTooltip, 10);
    });
  });

  // Expose update function globally in case validation logic changes
  window.updateNextButtonTooltip = updateTooltip;
}

// Helper function to create validation messages from field labels
function createValidationMessage(fieldLabel) {
  return fieldLabel;
}

// Helper function to check if a field is empty
function isFieldEmpty(element) {
  if (!element) return true;

  const value = element.value?.trim();
  const type = element.type;

  if (type === 'checkbox' || type === 'radio') {
    return !element.checked;
  }

  return !value || value === '';
}

// Helper function to get field label text
function getFieldLabel(fieldId) {
  const label = document.querySelector(`label[for="${fieldId}"]`);
  if (label) {
    // Remove any asterisks or required markers
    return label.textContent.replace(/\s*\*\s*/g, '').trim();
  }

  // Fallback: format field ID into readable text
  return fieldId
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}
