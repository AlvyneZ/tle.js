import { _MS_IN_A_DAY, _TLE_DATA_TYPES, _DATA_TYPES } from "./constants";

/**
 * General helper that provides more useful info than JavaScript's built-in "typeof" operator.
 *
 * Example:
 * getType([]);
 * -> 'array'
 */
export function getType(input) {
	const type = typeof input;

	if (Array.isArray(input)) {
		return _DATA_TYPES._ARRAY;
	}

	if (input instanceof Date) {
		return _DATA_TYPES._DATE;
	}

	if (Number.isNaN(input)) {
		return _DATA_TYPES._NAN;
	}

	return type;
}

/**
 * Determines if a number is positive.
 */
export const _isPositive = num => num >= 0;

/**
 * Determines the amount of digits in a number.  Used for converting a TLE's "leading decimal
 * assumed" notation.
 *
 * Example:
 * getDigitCount(12345);
 * -> 5
 */
export const _getDigitCount = num => {
	const absVal = Math.abs(num);
	return absVal.toString().length;
};

/**
 * Converts a TLE's "leading decimal assumed" notation to a float representation.
 *
 * Example:
 * toLeadingDecimal(12345);
 * -> 0.12345
 */
export const _toLeadingDecimal = num => {
	const numDigits = _getDigitCount(num);
	const zeroes = "0".repeat(numDigits - 1);
	return parseFloat(num * `0.${zeroes}1`);
};

/**
 * Converts a TLE's "leading decimal assumed" notation with leading zeroes to a float
 * representation.
 *
 * Example:
 * decimalAssumedEToFloat('12345-4');
 * -> 0.000012345
 */
export const _decimalAssumedEToFloat = str => {
	const numWithAssumedLeadingDecimal = str.substr(0, str.length - 2);
	const num = _toLeadingDecimal(numWithAssumedLeadingDecimal);
	const leadingDecimalPoints = parseInt(str.substr(str.length - 2, 2), 10);
	const float = num * Math.pow(10, leadingDecimalPoints);
	return parseFloat(float.toPrecision(5));
};

/**
 * Converts a fractional day of the year to a timestamp.  Used for parsing the TLE epoch.
 */
export const _dayOfYearToTimeStamp = (
	dayOfYear,
	year = new Date().getFullYear()
) => {
	const yearStart = new Date(`1/1/${year} 0:0:0 Z`);

	const yearStartMS = yearStart.getTime();

	return Math.floor(yearStartMS + (dayOfYear - 1) * _MS_IN_A_DAY);
};

/**
 * Converts radians (0 to 2π) to degrees (0 to 360).
 */
export const _radiansToDegrees = radians => radians * (180 / Math.PI);

/**
 * Converts degrees (0 to 360) to radians (0 to 2π).
 */
export const _degreesToRadians = degrees => degrees * (Math.PI / 180);

/**
 * Determines if a pair of longitude points crosses over the antemeridian, which is a
 * pain point for mapping software.
 */
export const _crossesAntemeridian = (longitude1, longitude2) => {
	if (!longitude1 || !longitude2) return false;

	const isLong1Positive = _isPositive(longitude1);
	const isLong2Positive = _isPositive(longitude2);
	const haveSameSigns = isLong1Positive === isLong2Positive;

	if (haveSameSigns) return false;

	// Signs don't match, so check if we're reasonably near the antemeridian (just to be sure it's
	// not the prime meridian).
	const isNearAntemeridian = Math.abs(longitude1) > 100;

	return isNearAntemeridian;
};

/**
 * Note: TLEs have a year 2000 style problem in 2057, because they only represent years in 2
 * characters.  This function doesn't account for that problem.
 *
 * Example:
 * _getFullYear(98);
 * -> 1998
 *
 * @param {Number} twoDigitYear
 */
export function _getFullYear(twoDigitYear) {
	const twoDigitYearInt = parseInt(twoDigitYear, 10);

	return twoDigitYearInt < 100 && twoDigitYearInt > 56
		? twoDigitYearInt + 1900
		: twoDigitYearInt + 2000;
}

/**
 * Gets a piece of data directly from a TLE line string, and attempts to parse it based on
 * data format.
 *
 * @param {Object} parsedTLE
 * @param {(1|2)} lineNumber TLE line number.
 * @param {Object} definition From line-1-definitions or line-2-definitions.
 */
export function getFromTLE(parsedTLE, lineNumber, definition) {
	const { tle } = parsedTLE;

	const line = lineNumber === 1 ? tle[0] : tle[1];
	const { start, length, type } = definition;

	const val = line.substr(start, length);

	let output;
	switch (type) {
		case _TLE_DATA_TYPES._INT:
			output = parseInt(val, 10);
			break;

		case _TLE_DATA_TYPES._FLOAT:
			output = parseFloat(val);
			break;

		case _TLE_DATA_TYPES._DECIMAL_ASSUMED:
			output = parseFloat(`0.${val}`);
			break;

		case _TLE_DATA_TYPES._DECIMAL_ASSUMED_E:
			output = _decimalAssumedEToFloat(val);
			break;

		case _TLE_DATA_TYPES._CHAR:
		default:
			output = val.trim();
			break;
	}

	return output;
}

/**
 * Returns the length of the keys in an object, ignoring the size of the values.
 *
 * @param {Object} obj
 */
export const _getObjLength = obj => Object.keys(obj).length;

/**
 * Function from minimize-golden-section-1d
 * https://www.npmjs.com/package/minimize-golden-section-1d?activeTab=readme
 * 
 * Finds the input bounds that enclose a minimum of a function
 * 
 * Note: The function has been changed for optimization:
 *  - searching for the bound will only be done in a single direction.
 *  - exponential increase in dx has been commented out (Necessary for
 *  application in TLE pass prediction in order to avoid missing passes).
 *  - In the end xL and xU are brought closer to the found bound.
 */
function bracketMinimum (f, x0, dx) {
	// If either size is unbounded (=infinite), Expand the guess
	// range until we either bracket a minimum or until we reach the bounds:
	let fU, fL, fMin, xU, bounded;
	xU = x0;
	fMin = fL = fU = f(x0);
	while (!bounded && isFinite(dx) && !isNaN(dx)) {
	    bounded = true;
  
	  	if (fU <= fMin) {
			fMin = fU;
			xU += dx;
			fU = f(xU);
			bounded = false;
		}
  
		// Track the smallest value seen so far:
		fMin = Math.min(fMin, fU);
	
		// If this is the case, then the function appears
		// to be minimized against the start point, so although we
		// haven't bracketed a minimum, we'll considere the procedure
		// complete because we appear to have bracketed a minimum
		// against the starting point:
		if (fL === fMin) {
			bounded = true;
		}
	}

	// Narrowing the bounds slightly
	let xL = xU - (2 * dx);
	if (x0 === (xL + dx)) {
		xL = x0;
	}
  
	return [xL, xU];
}

/**
 * Function from minimize-golden-section-1d
 * https://www.npmjs.com/package/minimize-golden-section-1d?activeTab=readme
 * 
 * Given bounds enclosing a minimum, this function converges on the minimum
 *  using the golden-section-search
 */
const PHI_RATIO = 2 / (1 + Math.sqrt(5));
function goldenSectionMinimize (f, xL, xU, tol, maxIterations, status) {
	let xF, fF;
	let iteration = 0;
	let x1 = xU - PHI_RATIO * (xU - xL);
	let x2 = xL + PHI_RATIO * (xU - xL);
	// Initial bounds:
	let f1 = f(x1);
	let f2 = f(x2);
  
	// Store these values so that we can return these if they're better.
	// This happens when the minimization falls *approaches* but never
	// actually reaches one of the bounds
	const f10 = f(xL);
	const f20 = f(xU);
	const xL0 = xL;
	const xU0 = xU;
  
	// Simple, robust golden section minimization:
	while (++iteration < maxIterations && Math.abs(xU - xL) > tol) {
		if (f2 > f1) {
			xU = x2;
			x2 = x1;
			f2 = f1;
			x1 = xU - PHI_RATIO * (xU - xL);
			f1 = f(x1);
		} else {
			xL = x1;
			x1 = x2;
			f1 = f2;
			x2 = xL + PHI_RATIO * (xU - xL);
			f2 = f(x2);
		}
	}
  
	xF = 0.5 * (xU + xL);
	fF = 0.5 * (f1 + f2);
  
	if (status) {
		status.iterations = iteration;
		status.argmin = xF;
		status.minimum = fF;
		status.converged = true;
	}
  
	if (isNaN(f2) || isNaN(f1) || iteration === maxIterations) {
		if (status) {
			status.converged = false;
		}
		return NaN;
	}
  
	if (f10 < fF) {
	  	return xL0;
	} else if (f20 < fF) {
	  	return xU0;
	} else {
	  	return xF;
	}
}

/**
 * Function from minimize-golden-section-1d
 * https://www.npmjs.com/package/minimize-golden-section-1d?activeTab=readme
 * 
 * Searches for the next minimum of a function
 */
export function _minimizeSearch (f, options, status) {
	options = options || {};
	let bounds = [0, 0];
	let x0;
	const tolerance = options.tolerance === undefined ? 1e-8 : options.tolerance;
	const dx = options.initialIncrement === undefined ? 1 : options.initialIncrement;
	const xMin = options.lowerBound === undefined ? -Infinity : options.lowerBound;
	const xMax = options.upperBound === undefined ? Infinity : options.upperBound;
	const maxIterations = options.maxIterations === undefined ? 100 : options.maxIterations;
  
	if (status) {
		status.iterations = 0;
		status.argmin = NaN;
		status.minimum = Infinity;
		status.converged = false;
	}
  
	if (isFinite(xMax) && isFinite(xMin)) {
		bounds[0] = xMin;
		bounds[1] = xMax;
	} else {
		x0 = xMin > -Infinity ? xMin : 0;
	
		bounds = bracketMinimum(f, x0, dx);
	}
  
	return goldenSectionMinimize(f, bounds[0], bounds[1], tolerance, maxIterations, status);
};
  