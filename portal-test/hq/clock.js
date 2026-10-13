/* The test copy's clock (scripts/build-portal-test.mjs): the recording is of one afternoon, so the page's clock starts at that moment
   and runs on from there. "Today", "updated n min ago" and the time-of-day light then always match the recorded data, on any day.
   Only Date is moved; timers run normally. */
(function () {
  var Real = Date, start = Real.parse('2026-10-12T15:05:00-05:00'), off = start - Real.now();
  function TestDate(a, b, c, d, e, f, g) {
    if (!(this instanceof TestDate)) return new Real(Real.now() + off).toString();
    switch (arguments.length) {
      case 0: return new Real(Real.now() + off);
      case 1: return new Real(a);
      default: return new Real(a, b, c === undefined ? 1 : c, d || 0, e || 0, f || 0, g || 0);
    }
  }
  TestDate.prototype = Real.prototype;
  TestDate.now = function () { return Real.now() + off; };
  TestDate.parse = Real.parse;
  TestDate.UTC = Real.UTC;
  Object.setPrototypeOf(TestDate, Real);
  window.Date = TestDate;
})();
