const fs = require('fs');

const States = {
    GENERIC: 0,
    HEADER: 1,
    TRACK: 2
}

const SubStates = {
    LENGTH: 0,
    DATA: 1
}

let file = {
    header: {
        division: {}
    },
    tracks: []
};

const buffer = fs.readFileSync('ymca.mid');

let values = buffer.values();

let result = values.next();

let state = States.GENERIC;
let substate = undefined;

let trail = [];
while (!result.done) {
    // Set substate, default of length, if necessary
    if (substate == undefined && state === States.HEADER) {
        substate = SubStates.LENGTH;
    }

    switch (state) {
        case States.HEADER:
            switch (substate) {
                case SubStates.LENGTH:
                    // Read the next four bytes to get the entire 32-bit length
                    let len = 0;
                    for (let i = 0; i < 4; i++) {
                        len += values.next().value;
                    }
                    file.header.length = len;
                    substate = SubStates.DATA;
                    break;
                case SubStates.DATA:
                    // <format> word
                    file.header.format = values.next().value;

                    // <ntrks> word
                    let ntrks = 0;
                    for (let i = 0; i < 2; i++) {
                        ntrks += values.next().value;
                    }
                    file.header.ntrks = ntrks;

                    // <division> word
                    let division = 0;
                    let byte = values.next().value;
                    file.header.division.format = (0b10000000 & byte === 0b10000000) > 0 ? 1 : 0;
                    if (file.header.division.format === 0) {
                        file.header.division.ticksPerQuarterNote = (byte & 0b01111111) + values.next().value;
                    } else {
                        file.header.division.negativeSMPTE = (byte & 0b01111111);
                        file.header.division.ticksPerFrame = values.next().value;
                    }

                    state = States.GENERIC;
                    break;
                default:
                    console.error('SubState not set');
                    break;
            }
            break;
        case States.TRACK:
            console.log('track');
            break;
        case States.GENERIC:
        default:
            trail.push(result.value);
            break;
    }

    //#region State changing
    if ([0x4D, 0x54, 0x68, 0x64].every((val, i) => val === trail[i])) {
        // Detect string 'MThd' for MIDI header
        trail = [];
        state = States.HEADER;
    } else if ([0x4D, 0x54, 0x72, 0x6B].every((val, i) => val === trail[i])) {
        // Detect string 'MTrk' for MIDI track
        trail = [];
        state = States.TRACK;
    } else {
        result = values.next();
    }
    //#endregion
}

console.dir(file);

function resetState() {
    state = States.GENERIC;
    substate = undefined;
}