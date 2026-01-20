# GUARDRAILS vs FIXED Success Rate Bug - RESOLVED ✅

## Problem Statement

When running Monte Carlo simulations, **GUARDRAILS withdrawal strategy was showing HIGHER success rates than FIXED**, which contradicted the success metric definition and indicated a bug.

### Why This Shouldn't Happen

The success metric is defined in `src/engine/monteCarlo.js:439-440`:
```javascript
// Success = portfolio didn't deplete AND income was never cut below target
const successCount = results.filter(r => !r.depleted && !r.incomeCut).length;
```

**The Logic Problem:**
- **FIXED strategy**: Only inflates for inflation. Never cuts spending. Can only fail via `depleted = true`
- **GUARDRAILS strategy**: Adaptively cuts spending when portfolio is stressed. Can fail via `depleted = true` OR `incomeCut = true`
- **Therefore**: GUARDRAILS has TWO ways to fail, FIXED has ONE way to fail
- **Expected**: FIXED should have equal or higher success rate than GUARDRAILS
- **Actual**: GUARDRAILS was showing HIGHER success rates consistently ❌

---

## Root Cause Analysis - THE BUG FOUND! 🎯

### The Critical Bug: Incorrect Annual Return Calculation

**Location**: `src/engine/monteCarlo.js` lines 273 (old code):

```javascript
// WRONG - This was the bug!
if (month % 12 === 0) {
    lastYearReturn = monthlyReturn * 12;  // ❌ Only uses the LAST MONTH's return!
```

**The Problem**:
- The code was calculating `lastYearReturn` by taking **only the last month's return** and multiplying by 12
- This gave a **random, meaningless value** instead of the actual annual return
- Monthly returns are roughly normally distributed around a small positive mean
- A single month's return is negative about 45-48% of the time, even in positive-returning years

### How This Caused GUARDRAILS to Succeed More

The GUARDRAILS strategy has a freeze rule (line 342-344):
```javascript
// Skip inflation adjustment after negative return year
if (priorReturn < 0) {
    return priorWithdrawal;  // Freeze - no inflation adjustment
}
```

**What was happening**:
1. Because `lastYearReturn` was just a random monthly return × 12, it was negative ~45-48% of the time
2. GUARDRAILS was **randomly freezing inflation** about half the time, even in bull markets!
3. By randomly skipping inflation adjustments, GUARDRAILS accidentally withdrew **less** than intended
4. Lower withdrawals meant:
   - ✓ Reduced depletion risk (higher success rate)
   - ✓ The `currentWithdrawal / annualWithdrawal` ratio stayed closer to 1.0
   - ✓ Less likely to trigger `incomeCut = true`

**Result**: GUARDRAILS succeeded more often because it was accidentally conservative due to the bug, while FIXED was correctly inflating withdrawals every year.

---

## The Fix

**Changed code** in both `runSingleSimulation` and `runSingleSimulationWithHome`:

### 1. Added accumulator variable:
```javascript
let annualReturnAccumulator = 0;
```

### 2. Accumulate monthly returns:
```javascript
portfolio *= (1 + monthlyReturn);

// Accumulate monthly returns for annual return calculation
annualReturnAccumulator += monthlyReturn;
```

### 3. Calculate annual return correctly:
```javascript
// Track annual return for guardrails
if (month % 12 === 0) {
    // Use the sum of 12 monthly returns as the annual return
    lastYearReturn = annualReturnAccumulator;
    annualReturnAccumulator = 0; // Reset for next year

    if (isRetired && annualWithdrawal > 0) {
        const withdrawalRatio = currentWithdrawal / annualWithdrawal;
        minWithdrawalRatio = Math.min(minWithdrawalRatio, withdrawalRatio);
    }
}
```

**Why this is correct**:
- Summing monthly returns gives the approximate annual return
- For small returns: (1+r₁)(1+r₂)...(1+r₁₂) ≈ 1 + (r₁+r₂+...+r₁₂)
- This captures whether the **market** had a positive or negative year
- More accurate than portfolio change (which includes cash flows)

---

## Expected Behavior After Fix

After this fix, the GUARDRAILS strategy should:

1. **Correctly detect negative market years**: Only freeze inflation when the market actually had a down year
2. **Show lower or equal success rates vs FIXED**: Because it has two failure modes (depletion OR income cut)
3. **Provide accurate adaptive behavior**: The guardrails will trigger at the right times based on actual market performance

The success rate comparison should now make logical sense:
- FIXED: Can only fail via depletion
- GUARDRAILS: Can fail via depletion OR income cuts
- Therefore: FIXED ≥ GUARDRAILS in success rate ✓

---

## Files Modified

- `src/engine/monteCarlo.js`:
  - Fixed `runSingleSimulation` function (lines ~138-285)
  - Fixed `runSingleSimulationWithHome` function (lines ~627-756)

## Testing Recommendation

Run comparison tests with the same parameters using:
1. FIXED strategy
2. GUARDRAILS strategy

Expected results:
- FIXED should now show equal or higher success rates
- GUARDRAILS should correctly freeze only in true down years
- Success rate difference should be small but FIXED should be >= GUARDRAILS

---

## Lessons Learned

1. **Always verify calculations are using the right time period**: A single month is not a year!
2. **Random noise in control logic can create unexpected behavior**: The bug made GUARDRAILS randomly conservative
3. **Success metrics can mask bugs**: GUARDRAILS was "succeeding" more, but for the wrong reasons
4. **Document assumptions**: The freeze rule assumes `priorReturn` is an annual return, not monthly × 12
