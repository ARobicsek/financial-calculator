
import fs from 'fs';

const actualPath = 'testing_results.md';
const expectedPath = 'TESTING_SCENARIOS.md';

const actualContent = fs.readFileSync(actualPath, 'utf8');
const expectedContent = fs.readFileSync(expectedPath, 'utf8');

function parseActuals(content) {
    const scenarios = {};
    let currentScenario = null;
    let currentStrategy = null;

    const lines = content.split('\n');
    for (const line of lines) {
        const scenarioMatch = line.match(/^### SCENARIO (\d+):/);
        if (scenarioMatch) {
            currentScenario = parseInt(scenarioMatch[1]);
            scenarios[currentScenario] = {};
            continue;
        }

        const strategyMatch = line.match(/^#### (.+) Strategy/); // "Risk-Matched Strategy" -> "Risk-Matched"
        if (strategyMatch) {
            let stratName = strategyMatch[1].trim();
            // Normalize names if needed
            if (stratName === 'Current Strategy') stratName = 'Current'; // Handle double "Strategy" if present or not
            // My output had "Current Strategy" header, but script printed "Current Strategy Strategy" sometimes?
            // Wait, previous output: "#### Current Strategy" (Step 189).
            // So standard is "Current".
            // Step 189: "#### Current Strategy" -> regex `^#### (.+) Strategy` captures "Current".

            // Check for "Current Strategy Strategy"
            if (line.includes('Current Strategy Strategy')) {
                stratName = 'Current';
            }

            currentStrategy = stratName;
            if (currentScenario) scenarios[currentScenario][currentStrategy] = {};
            continue;
        }

        if (currentScenario && currentStrategy) {
            const medianMatch = line.match(/- Median Portfolio.*: \$([\d.]+)M/);
            if (medianMatch) scenarios[currentScenario][currentStrategy].median = parseFloat(medianMatch[1]);

            const successMatch = line.match(/- Success Rate: (\d+)%/);
            if (successMatch) scenarios[currentScenario][currentStrategy].success = parseInt(successMatch[1]);

            const returnMatch = line.match(/- Expected Return: ([\d.]+)%/);
            if (returnMatch) scenarios[currentScenario][currentStrategy].return = parseFloat(returnMatch[1]);

            const volMatch = line.match(/- Volatility: ([\d.]+)%/);
            if (volMatch) scenarios[currentScenario][currentStrategy].volatility = parseFloat(volMatch[1]);
        }
    }
    return scenarios;
}

function parseExpecteds(content) {
    const scenarios = {};
    let currentScenario = null;
    let currentStrategy = null;

    const lines = content.split('\n');
    for (const line of lines) {
        // ## Test Scenario 1: ...
        const scenarioMatch = line.match(/^## Test Scenario (\d+):/);
        if (scenarioMatch) {
            currentScenario = parseInt(scenarioMatch[1]);
            scenarios[currentScenario] = {};
            continue;
        }

        // #### 1. Risk-Matched Strategy
        const strategyMatch = line.match(/^#### \d+\. (.+) Strategy/);
        if (strategyMatch) {
            let stratName = strategyMatch[1].trim();
            // "Current Strategy (with ...)" -> "Current"
            if (stratName.startsWith('Current')) stratName = 'Current';

            currentStrategy = stratName;
            if (currentScenario) scenarios[currentScenario][currentStrategy] = {};
            continue;
        }

        if (currentScenario && currentStrategy) {
            // - Portfolio ...: ~$5.5M - $6.0M
            const medianMatch = line.match(/- Portfolio.*: ~\$([\d.]+)M - \$([\d.]+)M/);
            if (medianMatch) {
                scenarios[currentScenario][currentStrategy].medianMin = parseFloat(medianMatch[1]);
                scenarios[currentScenario][currentStrategy].medianMax = parseFloat(medianMatch[2]);
                scenarios[currentScenario][currentStrategy].medianText = `$${medianMatch[1]}M-$${medianMatch[2]}M`;
            }

            // - Success Rate: 88-94%
            const successMatch = line.match(/- Success Rate: (\d+)-(\d+)%/);
            if (successMatch) {
                scenarios[currentScenario][currentStrategy].successMin = parseInt(successMatch[1]);
                scenarios[currentScenario][currentStrategy].successMax = parseInt(successMatch[2]);
                scenarios[currentScenario][currentStrategy].successText = `${successMatch[1]}-${successMatch[2]}%`;
            }

            // Expected Return: ~6.5-7.0%
            const returnMatch = line.match(/- Expected Return: ~([\d.]+)-([\d.]+)%/);
            if (returnMatch) {
                scenarios[currentScenario][currentStrategy].returnText = `${returnMatch[1]}-${returnMatch[2]}%`;
            }

            // Volatility: ~15-16%
            const volMatch = line.match(/- Volatility: ~([\d.]+)-([\d.]+)%/);
            if (volMatch) {
                scenarios[currentScenario][currentStrategy].volText = `${volMatch[1]}-${volMatch[2]}%`;
            }
        }
    }
    return scenarios;
}

const actuals = parseActuals(actualContent);
const expecteds = parseExpecteds(expectedContent);

console.log('| Scenario | Strategy | Expected Median | Actual Median | Variance | Expected Success | Actual Success | Variance | Expected Return | Actual Return | Expected Vol | Actual Vol | Notes |');
console.log('|----------|----------|-----------------|---------------|----------|------------------|----------------|----------|-----------------|---------------|--------------|------------|-------|');

for (let i = 1; i <= 12; i++) {
    const strategies = ['Risk-Matched', 'US-Focused', 'Global Tilt', 'Income-Focused', 'Current'];

    for (const strat of strategies) {
        const act = actuals[i]?.[strat] || {};
        const exp = expecteds[i]?.[strat] || {};

        const actMedian = act.median ? `$${act.median.toFixed(2)}M` : 'N/A';
        const expMedian = exp.medianText || 'N/A';

        let medianVar = 'N/A';
        if (act.median && exp.medianMin) {
            // Variance from midpoint? Or range check?
            // Instructions say: "Variance %". Maybe (Actual - ExpectedMid) / ExpectedMid?
            const expMid = (exp.medianMin + exp.medianMax) / 2;
            const diff = (act.median - expMid) / expMid;
            medianVar = `${(diff * 100).toFixed(1)}%`;
        }

        const actSuccess = act.success !== undefined ? `${act.success}%` : 'N/A';
        const expSuccess = exp.successText || 'N/A';

        let successVar = 'N/A';
        if (act.success !== undefined && exp.successMin) {
            const expMid = (exp.successMin + exp.successMax) / 2;
            const diff = act.success - expMid; // Percentage points difference usually better for rates?
            // Instructions say "Variance %". Let's assume % difference or points. Use points for rates?
            // "Within ±8 percentage points".
            // So just Current - Midpoint.
            successVar = `${diff.toFixed(1)} pts`;
        }

        const actRet = act.return ? `${act.return}%` : 'N/A';
        const expRet = exp.returnText || 'N/A';
        const actVol = act.volatility ? `${act.volatility}%` : 'N/A';
        const expVol = exp.volText || 'N/A';

        let note = '';
        if (medianVar !== 'N/A' && Math.abs(parseFloat(medianVar)) > 15) note += 'HIGH VARIANCE. ';
        if (successVar !== 'N/A' && Math.abs(parseFloat(successVar)) > 8) note += 'HIGH VARIANCE. ';
        if (i === 11 && strat === 'Risk-Matched') note += 'LOW SUCCESS. ';

        console.log(`| ${i} | ${strat} | ${expMedian} | ${actMedian} | ${medianVar} | ${expSuccess} | ${actSuccess} | ${successVar} | ${expRet} | ${actRet} | ${expVol} | ${actVol} | ${note} |`);
    }
}
