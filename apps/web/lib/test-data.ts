/**
 * Test-data visibility policy.
 *
 * Records created by automated tests are flagged `isTestData` and hidden from
 * normal UI queries. They are never auto-deleted — Playwright cleans up its own
 * records. A dev-only toggle (`?showTestData=1`) can reveal them.
 */
export const SHOW_TEST_DATA_PARAM = "showTestData";

/** Prisma `where` fragment: exclude test companies unless explicitly shown. */
export function testDataFilter(show?: boolean) {
  return show ? {} : { isTestData: false };
}

/** Dev-only: the toggle is ignored in production so real users never see it. */
export function canToggleTestData() {
  return process.env.NODE_ENV !== "production";
}

export function showTestDataFrom(searchParams?: { showTestData?: string }) {
  return canToggleTestData() && searchParams?.showTestData === "1";
}
