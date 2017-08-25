import EventEmitter from "events";
import { WritableStreamBuffer } from "stream-buffers";
import unicons from "unicons";
import ci from "../../src/reporters/ci";
import events from "../fixtures/events";

function setup(reporterConfig = {}) {
    const updtr = new EventEmitter();
    const stdout = new WritableStreamBuffer();

    stdout.isTTY = true;
    stdout.columns = 80;

    reporterConfig.stream = stdout;
    ci(updtr, reporterConfig);

    return {
        updtr,
        stdout,
    };
}

beforeAll(() => {
    // We need to replace platform-dependent characters with static counter parts to make snapshot testing
    // consistent across platforms.
    unicons.cli = sign => {
        switch (sign) {
            case "circle":
                return "-";
            default:
                return "";
        }
    };
});

describe("ci()", () => {
    Object.keys(events).forEach(caseName => {
        describe(caseName, () => {
            it("should print the expected lines", async () => {
                const testCase = events[caseName];
                const { updtr, stdout } = setup(testCase.reporterConfig);

                await testCase.events.reduce(async (previous, [
                    eventName,
                    event,
                ]) => {
                    await previous;
                    updtr.emit(eventName, event);

                    // Faking async events
                    return Promise.resolve();
                }, Promise.resolve());

                const output = stdout.getContentsAsString("utf8");

                expect(
                    output.replace(
                        // We need to replace the timing because that is non-deterministic
                        /Finished after \d+\.\ds/,
                        "Finished after 1.0s"
                    )
                ).toMatchSnapshot(caseName);
            });
        });
    });
});
