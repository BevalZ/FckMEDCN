import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: import('@playwright/test').Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('季度预算是确定的，且 breakdown 与总额严格对账', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const { gs, ec } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ stage: 'career', familyWealth: 'middle', financeStrategy: 'stable', studentLoanBalance: 3000, mortgageBalance: 20000 });
    gs.setFlag('student_loan');
    gs.setFlag('bought_house');
    const first = ec.getQuarterEconomy('career', undefined, 2500);
    const second = ec.getQuarterEconomy('career', undefined, 2500);
    const incomeSum = (Object.values(first.breakdown.income) as number[]).reduce((sum, value) => sum + value, 0);
    const expenseSum = (Object.entries(first.breakdown.expense) as Array<[string, number]>).reduce((sum, [key, value]) => sum + (key === 'thriftDiscount' ? -value : value), 0);
    return { same: JSON.stringify(first) === JSON.stringify(second), incomeSum, expenseSum, income: first.income, cost: first.cost, net: first.net };
  });
  expect(result.same).toBe(true);
  expect(result.incomeSum).toBe(result.income);
  expect(result.expenseSum).toBe(result.cost);
  expect(result.income - result.cost).toBe(result.net);
});

test('助学贷款与房贷按余额偿还，清零后不会再次生成债务', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const { gs, ec } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ stage: 'career', financeStrategy: 'stable', studentLoanBalance: 1500, mortgageBalance: 1000, stats: { ...gs.getState().stats, money: 10000 } });
    gs.setFlag('student_loan');
    gs.setFlag('bought_house');
    const first = ec.applyStageEconomy('career');
    const afterFirst = gs.getState();
    const second = ec.applyStageEconomy('career');
    const afterSecond = gs.getState();
    return {
      firstLoan: afterFirst.studentLoanBalance,
      firstMortgage: afterFirst.mortgageBalance,
      secondLoan: afterSecond.studentLoanBalance,
      secondMortgage: afterSecond.mortgageBalance,
      secondRepayment: second.breakdown.expense.studentLoanRepayment,
      secondMortgagePayment: second.breakdown.expense.mortgage,
      loanRepaid: afterSecond.flags.has('student_loan_repaid'),
      mortgagePaid: afterSecond.flags.has('mortgage_paid_off'),
      firstCash: first.cashChange,
    };
  });
  expect(result.firstLoan).toBe(0);
  expect(result.firstMortgage).toBe(0);
  expect(result.secondLoan).toBe(0);
  expect(result.secondMortgage).toBe(0);
  expect(result.secondRepayment).toBe(0);
  expect(result.secondMortgagePayment).toBe(0);
  expect(result.loanRepaid).toBe(true);
  expect(result.mortgagePaid).toBe(true);
  expect(result.firstCash).toBeGreaterThan(0);
});

test('仅有历史资格 flag 时不会凭空复活债务', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const { gs, ec } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({
      stage: 'career', studentLoanBalance: 0, mortgageBalance: 0,
      flags: new Set(['student_loan', 'bought_house']),
    });
    const budget = ec.getQuarterEconomy('career');
    ec.applyStageEconomy('career');
    return {
      loanPayment: budget.breakdown.expense.studentLoanRepayment,
      mortgagePayment: budget.breakdown.expense.mortgage,
      loanBalance: gs.getState().studentLoanBalance,
      mortgageBalance: gs.getState().mortgageBalance,
    };
  });
  expect(result).toEqual({ loanPayment: 0, mortgagePayment: 0, loanBalance: 0, mortgageBalance: 0 });
});

test('贷款受授信上限约束，购房前后净资产守恒', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const { gs, ec } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({
      stage: 'undergrad', studentLoanBalance: 29500, assets: 10000,
      stats: { ...gs.getState().stats, money: 20000 }, flags: new Set(['student_loan', 'offer_sanjia']),
    });
    const loan = ec.applyStageEconomy('undergrad');
    const loanBalance = gs.getState().studentLoanBalance;
    const loanDisbursement = loan.breakdown.income.studentLoan;
    const beforeHouse = ec.netWorth();
    gs.setFlag('bought_house');
    ec.payHouseDownPayment();
    const afterHouse = ec.netWorth();
    return { loanBalance, loanDisbursement, beforeHouse, afterHouse, property: ec.propertyValue(), debt: ec.totalDebt() };
  });
  expect(result.loanDisbursement).toBe(500);
  expect(result.loanBalance).toBe(30000);
  expect(result.property).toBeGreaterThan(0);
  expect(result.debt).toBeGreaterThanOrEqual(result.loanBalance);
  expect(result.afterHouse).toBe(result.beforeHouse);
});

test('财务累计区分经营收支与融资现金流', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const { gs, tf } = (window as any).__mod;
    gs.resetGame();
    gs.patchState({ stage: 'undergrad', studentLoanBalance: 0, financeStrategy: 'stable' });
    gs.setFlag('student_loan');
    const school = tf.advanceQuarter('undergrad');
    const afterSchool = gs.getState().finance;

    gs.patchState({ stage: 'career', studentLoanBalance: 1500, mortgageBalance: 1000 });
    gs.setFlag('bought_house');
    const career = tf.advanceQuarter('career');
    const afterCareer = gs.getState().finance;
    return {
      schoolIncome: school.econ.income,
      loanCash: school.econ.breakdown.income.studentLoan,
      lifetimeAfterSchool: afterSchool.lifetimeEarnings,
      careerCost: career.econ.cost,
      principal: career.econ.breakdown.expense.studentLoanRepayment + career.econ.breakdown.expense.mortgage,
      lifetimeExpenseDelta: afterCareer.lifetimeExpenses - afterSchool.lifetimeExpenses,
    };
  });
  expect(result.lifetimeAfterSchool).toBe(result.schoolIncome - result.loanCash);
  expect(result.lifetimeExpenseDelta).toBe(result.careerCost - result.principal);
});
