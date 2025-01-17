import {
  type InputChannel,
  type OutputChannel,
}                           from 'webmidi';
import {
  effect,
  signal,
}                           from '@preact/signals';

import { type ChordNumber } from '../harmony/scales';
import {
  type Instrument,
  type NoteEventHandler,
}  from '../instruments/types';
import {
  type MIDINumber,
  getClosestNote,
  setActiveChord,
}                           from '../conductor/state';

/// Types ----------------------------------------------------------------------

type Options = {
  localChords:              boolean;
};

/// Constant values ------------------------------------------------------------

const CHORDS: Record< number, ChordNumber > = {
  112:                      'i',
  113:                      'ii',
  114:                      'iii',
  115:                      'iv',
  116:                      'v',
  117:                      'vi',
  118:                      'vii',
  119:                      'i',
};

/// State ----------------------------------------------------------------------

const lpIn =                signal< InputChannel | null >( null );
const lpOut =               signal< OutputChannel | null >( null );
const notesIn =             signal< InputChannel | null >( null );
const notesOut =            signal< OutputChannel | null >( null );
const options =             signal< Options >({
  localChords:              false,
});

const notesOn: Record< number, MIDINumber> = {};

/// Private functions ----------------------------------------------------------

const midiPanic = () => {

  notesOut.value?.sendAllNotesOff();
  notesOut.value?.sendAllSoundOff();
};

const onLpNoteOff: NoteEventHandler = ({ note }) => {
  console.debug( 'keyboard onLpNoteOff', note.number );
};

const onLpNoteOn: NoteEventHandler = ({ note }) => {
  console.debug( 'keyboard onLpNoteOn', note.number );

  if( note.number in CHORDS ){
    setActiveChord( CHORDS[note.number] );
    Object.keys( CHORDS )
      .map( Number )
      .forEach( midiNote =>
        lpOut.value?.sendNoteOff( midiNote )
      );
    lpOut.value?.sendNoteOn( note );
  }
}

const onNoteOff: NoteEventHandler = ({ note }) => {
  console.debug( 'keyboard onNoteOff', note.number, note.rawRelease );

  notesOut.value?.sendNoteOff( notesOn[ note.number ], note );
};

const onNoteOn: NoteEventHandler = ({ note }) => {
  console.debug( 'keyboard onNoteOn', note.number, note.rawAttack );

  const midiNote = getClosestNote( note.number as MIDINumber );
  notesOn[note.number] =   midiNote;
  notesOut.value?.sendNoteOn( midiNote, note );
}

/// Effects --------------------------------------------------------------------

effect(() => {
  const notesInput =      notesIn.value?.input;
  const lpInput =         lpIn.value?.input;

  if( notesInput ){
    notesInput.addListener( 'noteoff', onNoteOff );
    notesInput.addListener( 'noteon', onNoteOn );
  }
  if( lpInput ){
    lpInput.addListener( 'noteoff', onLpNoteOff );
    lpInput.addListener( 'noteon', onLpNoteOn );
  }

  return () => {
    if( notesInput ){
      notesInput.removeListener( 'noteoff', onNoteOff );
      notesInput.removeListener( 'noteon', onNoteOn );
    }
    if( lpInput ){
      lpInput.removeListener( 'noteoff', onLpNoteOff );
      lpInput.removeListener( 'noteon', onLpNoteOn );
    }
  };
});

/// Exports --------------------------------------------------------------------

export const inputs = {
  'Keyboard':               notesIn,
  'LaunchPad':              lpIn,
};
export const outputs = {
  'Keys track':             notesOut,
  'LaunchPad':              lpOut,
};

export const setOptions = ( newOptions: Options ) => {
  options.value = {
    ...options.value,
    ...newOptions,
  };
};

export const keyboard: Instrument = {
  label:                    'Keyboard',
  inputs,
  midiPanic,
  outputs,
  setOptions,
};
