/*****
* Nokia Composer Class
* by Faiz Ilham
*
* Nokia Composer Ringtone parser and player class
*
****/

class NokiaComposer {
	constructor(waveType){
		/*** init defaults ***/
		this.playing = false;
		this.onStop = () => {};
		this.onNotePlaying = () => {};
		this.waveType = waveType || "sine";
		
		/*** init AudioContext and constants ***/
		this.audio_ctx = new (window.AudioContext || window.webkitAudioContext)();
		this.note_pattern = /^(\d+)(.?)(?:(#?[acdfgACDFG]|[beBE])([1-3])|([\-pP]))$/;
		this.frequency_table = {
			"c": 261.63,
			"#c": 277.18,
			"d": 293.66,
			"#d": 311.13,
			"e": 329.63,
			"f": 349.23,
			"#f": 369.99,
			"g": 392,
			"#g": 415.3,
			"a": 440,
			"#a": 466.16,
			"b": 493.88
		};
	}
	
	setWaveType(waveType){
		this.waveType = waveType;
	}
	
	parse(text){
		// trim and split by spaces
		let notes = text.trim().split(/\s+/);		
		let pos = 0;
		
		let tunes = notes.map((note, idx) => {
			let matches = this.note_pattern.exec(note);
			
			// get note's start & end position in the original text
			let start_pos = text.indexOf(note, pos);
			let end_pos = start_pos + note.length;
			
			if (!matches) {
				throw {message: "Invalid note", token: note, start_pos, end_pos};
			}
			
			pos = end_pos;
			
			let [, length_portion, halfdot, base_note, octave, rest] = matches;
			
			// parse note length
			let length = 1 / length_portion;
			if (halfdot) length *= 1.5;
			
			// parse frequency based on note and octave, rest notes = 0
			let frequency = 0;
			
			if (base_note){
				frequency = this.frequency_table[base_note.toLowerCase()] * (1 << (octave - 1));
			}
			
			return {frequency, length, note, start_pos, end_pos};
		});
		
		return tunes;
	}
	
	playWave(waves, idx){
		// the actual function that plays the oscillator
		
		if (idx === waves.length){
			this.playing = false;
			this.onStop();
			return;
		}
		
		let {oscillator, duration, note, start_pos, end_pos} = waves[idx];
		
		// play if oscillator exist (not rest)
		if (oscillator){
			oscillator.start();
			this.currentOscillator = oscillator;
		} else {
			this.currentOscillator = null;
		}
		
		// onNotePlaying listener
		this.onNotePlaying(note, start_pos, end_pos);
		
		// stop oscillator after duration
		this.currentTask = setTimeout(() => {
			if (oscillator) oscillator.stop();
			
			this.playWave(waves, idx + 1);
		}, duration);
	}
	
	play(tunes, bpm){
		if (this.playing) return;
		this.playing = true;
		
		// baseDuration = full note length in ms
		this.baseDuration = 60000 * 4 / bpm;
		
		let waves = tunes.map( ({frequency, length, note, start_pos, end_pos}) => {
			// create oscillators based on frequency and note length
			let duration = Math.floor(length * this.baseDuration);
			
			let oscillator;
			if (frequency){
				oscillator = this.audio_ctx.createOscillator();
				oscillator.type = this.waveType;
				oscillator.frequency.value = frequency;
				oscillator.connect(this.audio_ctx.destination);
			}
			
			return {duration, oscillator, note, start_pos, end_pos};
		});
		
		this.playWave(waves, 0);
	}
	
	stop(){
		if (!this.playing) return;
		try {
			// clear setTimeout task and stop current oscillator
			if (this.currentTask) clearTimeout(this.currentTask);
			if (this.currentOscillator) this.currentOscillator.stop();	
		} catch(e) {}
		
		this.playing = false;
		this.onStop();
	}
};

(function () {
	// for exports
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = NokiaComposer;
	}
})();
