/**
 * Local storage utility for flight plans
 */

const FLIGHT_PLANS_KEY = 'geoFlightPlans';

/**
 * Save a flight plan to local storage
 * @param {string} name - Name of the flight plan
 * @param {object} data - Flight plan data
 */
export const saveFlightPlan = (name, data) => {
  try {
    const existingPlans = getFlightPlans();
    existingPlans[name] = {
      ...data,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem(FLIGHT_PLANS_KEY, JSON.stringify(existingPlans));
    return true;
  } catch (error) {
    console.error('Error saving flight plan:', error);
    return false;
  }
};

/**
 * Get all flight plans from local storage
 * @returns {object} Object containing all flight plans
 */
export const getFlightPlans = () => {
  try {
    const plans = localStorage.getItem(FLIGHT_PLANS_KEY);
    return plans ? JSON.parse(plans) : {};
  } catch (error) {
    console.error('Error retrieving flight plans:', error);
    return {};
  }
};

/**
 * Get a specific flight plan by name
 * @param {string} name - Name of the flight plan
 * @returns {object|null} Flight plan data or null if not found
 */
export const getFlightPlan = (name) => {
  try {
    const plans = getFlightPlans();
    return plans[name] || null;
  } catch (error) {
    console.error('Error retrieving flight plan:', error);
    return null;
  }
};

/**
 * Delete a flight plan by name
 * @param {string} name - Name of the flight plan to delete
 * @returns {boolean} Success status
 */
export const deleteFlightPlan = (name) => {
  try {
    const existingPlans = getFlightPlans();
    delete existingPlans[name];
    localStorage.setItem(FLIGHT_PLANS_KEY, JSON.stringify(existingPlans));
    return true;
  } catch (error) {
    console.error('Error deleting flight plan:', error);
    return false;
  }
};

/**
 * Get list of all flight plan names
 * @returns {string[]} Array of flight plan names
 */
export const getFlightPlanNames = () => {
  try {
    const plans = getFlightPlans();
    return Object.keys(plans);
  } catch (error) {
    console.error('Error retrieving flight plan names:', error);
    return [];
  }
};