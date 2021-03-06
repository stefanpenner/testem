var expect = require('chai').expect;
var path = require('path');

var Config = require('../../lib/config');
var Launcher = require('../../lib/launcher.js');
var TapProcessTestRunner = require('../../lib/runners/tap_process_test_runner');

var FakeReporter = require('../support/fake_reporter');

describe('tap process test runner', function() {
  describe('onTestResult', function() {
    var runner, reporter, launcher;

    beforeEach(function() {
      reporter = new FakeReporter();
      var config = new Config('ci', {
        reporter: reporter
      });

      var settings = {
        exe: 'node',
        args: [path.join(__dirname, '../fixtures/processes/echo.js')],
        protocol: 'tap'
      };
      launcher = new Launcher('tap', settings, config);
      runner = new TapProcessTestRunner(launcher, reporter);
    });

    it('reads tap', function(done) {
      var tap = [
        'TAP version 13',
        '# hello says hello',
        'ok 1 hello() should be "hello world"',
        '# hello says hello to bob',
        'ok 2 hello(bob) should be "hello bob"',
        '',
        '1..2',
        '# tests 2',
        '# pass  2',
        '',
        '# ok'
      ].join('\n');
      runner.start(function() {
        expect(reporter.results).to.deep.equal([
          {
            result: {
              failed: 0,
              id: 1,
              items: [],
              launcherId: launcher.id,
              name: 'hello() should be "hello world"',
              passed: 1,
              total: 1
            }
          },
          {
            result: {
              failed: 0,
              id: 2,
              items: [],
              launcherId: launcher.id,
              name: 'hello(bob) should be "hello bob"',
              passed: 1,
              total: 1
            }
          }
        ]);
        done();
      });
      launcher.process.stdin.end(tap);
    });

    it('read tap with failing test case', function(done) {
      var tap = [
        'TAP version 13',
        '# hello says hello',
        'not ok 1 hello() should be "hello world"',
        '  ---',
        '    operator: equal',
        '    expected: "hell world"',
        '    actual:   "hello world"',
        '    at: Test._cb (/Users/david/git/testem/examples/tape_example/tests.js:6:7)',
        '  ...',
        '# hello says hello to bob',
        'ok 2 hello(bob) should be "hello bob"',
        ' ',
        '1..2',
        '# tests 2',
        '# pass  1',
        '# fail  1'
      ].join('\n');
      runner.start(function() {
        expect(reporter.results).to.deep.equal([
          {
            result: {
              failed: 1,
              id: 1,
              items: [{
                actual: 'hello world',
                at: 'Test._cb (/Users/david/git/testem/examples/tape_example/tests.js:6:7)',
                diag: {
                  actual: 'hello world',
                  at: 'Test._cb (/Users/david/git/testem/examples/tape_example/tests.js:6:7)',
                  expected: 'hell world',
                  operator: 'equal'
                },
                expected: 'hell world',
                id: 1,
                name: 'hello() should be "hello world"',
                ok: false,
                operator: 'equal',
                passed: false,
                stack: '\'Test._cb (/Users/david/git/testem/examples/tape_example/tests.js:6:7)\'\n'
              }],
              launcherId: launcher.id,
              name: 'hello() should be "hello world"',
              passed: 0,
              total: 1
            }
          },
          {
            result: {
              failed: 0,
              id: 2,
              items: [],
              launcherId: launcher.id,
              name: 'hello(bob) should be "hello bob"',
              passed: 1,
              total: 1
            }
          }
        ]);

        done();
      });
      launcher.process.stdin.end(tap);
    });

    it('reads tape output with a stacktrace', function(done) {
      var tap = [
        'TAP version 13',
        '# hello says hello',
        'ok 1 hello() should be "hello world"',
        '# hello says hello to bob',
        'not ok 2 Error: blah',
        '  ---',
        '    operator: error',
        '    expected: ',
        '    actual:   {}',
        '    stack:',
        '      Error: blah',
        '        at Test._cb (/Users/airportyh/Home/Code/testem/examples/tape_example/tests.js:11:11)',
        '        at Test.run (/Users/airportyh/Home/Code/testem/examples/tape_example/node_modules/tape/lib/test.js:52:14)',
        '        at Test.<anonymous> (/Users/airportyh/Home/Code/testem/examples/tape_example/node_modules/tape/lib/results.js:108:24)',
        '        at Test.g (events.js:175:14)',
        '        at Test.EventEmitter.emit (events.js:92:17)',
        '        at Test.end (/Users/airportyh/Home/Code/testem/examples/tape_example/node_modules/tape/lib/test.js:85:27)',
        '        at Object._onImmediate (/Users/airportyh/Home/Code/testem/examples/tape_example/node_modules/tape/lib/test.js:163:35)',
        '        at processImmediate [as _immediateCallback] (timers.js:330:15)',
        '  ...',
        '',
        '1..2',
        '# tests 2',
        '# pass  0',
        '# fail  2'
      ].join('\n');
      runner.start(function() {
        var total = reporter.total;
        var pass = reporter.pass;
        expect(pass).to.equal(1);
        expect(total).to.equal(2);

        var results = reporter.results;
        var failingTest = results[1];
        var failingItems = failingTest.result.items;
        var stack = failingItems[0].stack;
        expect(typeof stack).to.equal('string');
        expect(stack).to.match(/Error\:/);

        done();
      });
      launcher.process.stdin.end(tap);
    });

    it('reads tap output from mocha with stacktrace', function(done) {
      var tap = [
        '1..2',
        'ok 1 hello should say hello',
        'not ok 2 hello should say hello to person',
        '  ReferenceError: ethueo is not defined',
        '      at Context.<anonymous> (/Users/airportyh/Home/Code/testem/examples/hybrid_simple/tests.js:16:9)',
        '      at Test.Runnable.run (/usr/local/lib/node_modules/mocha/lib/runnable.js:211:32)',
        '      at Runner.runTest (/usr/local/lib/node_modules/mocha/lib/runner.js:355:10)',
        '      at /usr/local/lib/node_modules/mocha/lib/runner.js:401:12',
        '      at next (/usr/local/lib/node_modules/mocha/lib/runner.js:281:14)',
        '      at /usr/local/lib/node_modules/mocha/lib/runner.js:290:7',
        '      at next (/usr/local/lib/node_modules/mocha/lib/runner.js:234:23)',
        '      at Object._onImmediate (/usr/local/lib/node_modules/mocha/lib/runner.js:258:5)',
        '      at processImmediate [as _immediateCallback] (timers.js:330:15)',
        '# tests 2',
        '# pass 1',
        '# fail 1'
      ].join('\n');
      runner.start(function() {
        var total = reporter.total;
        var pass = reporter.pass;
        expect(pass).to.equal(1);
        expect(total).to.equal(2);

        var results = reporter.results;
        var failingTest = results[1];
        var failingItems = failingTest.result.items;
        var error = failingItems[0];
        expect(error.stack).to.match(/Error\:/);
        expect(typeof error.stack).to.equal('string');
        done();
      });
      launcher.process.stdin.end(tap);
    });
  });
});
