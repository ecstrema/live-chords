

export class FrequencyViz {
  name = "Frequency";

  constructor(targetElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 800;
    this.canvas.height = 400;
    targetElement.appendChild(this.canvas);
    this.canvasCtx = this.canvas.getContext('2d');
  }

  draw({ analyser, bufferLength, dataArray }) {
    analyser.getByteFrequencyData(dataArray);

    this.canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const barWidth = (this.canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i];

      this.canvasCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
      this.canvasCtx.fillRect(x, this.canvas.height - barHeight / 2, barWidth, barHeight / 2);

      x += barWidth + 1;
    }
  }
}

export class WaveformViz {
  name = "Waveform";

  constructor(targetElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 800;
    this.canvas.height = 400;
    targetElement.appendChild(this.canvas);
    this.canvasCtx = this.canvas.getContext('2d');
  }

  draw({ analyser, bufferLength, dataArray }) {
    analyser.getByteTimeDomainData(dataArray);

    this.canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.canvasCtx.lineWidth = 2;
    this.canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

    this.canvasCtx.beginPath();

    const sliceWidth = this.canvas.width * 1.0 / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * this.canvas.height / 2;

      if (i === 0) {
        this.canvasCtx.moveTo(x, y);
      } else {
        this.canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.canvasCtx.lineTo(this.canvas.width, this.canvas.height / 2);
    this.canvasCtx.stroke();
  }
}

export class PianoViz {
  name = "Piano";

  constructor(targetElement) {
    this.playingKeys = {}
    this.pianoChartPromise = import("https://cdn.jsdelivr.net/npm/piano-chart@1.5.0/+esm")
      .then(module => {
        this.piano = new module.Instrument(targetElement, {
          keyPressStyle: "vivid",
        })
        this.piano.create();
      });
  }

  draw({ bufferLength, dataArray, audioContext, time }) {
    if (!this.piano) {
      return;
    }

    const peakFrequencies = [];

    // Find the 10 highest peaks in the frequency data
    for (let i = 0; i < 10; i++) {
      let max = 0;
      let maxIndex = 0;
      for (let j = 0; j < bufferLength; j++) {
        if (dataArray[j] > max && !peakFrequencies.includes(j)) {
          max = dataArray[j];
          maxIndex = j;
        }
      }
      peakFrequencies.push(maxIndex);
    }

    // Remove frequencies that are too low to be a note
    // Remove frequencies that are too quiet to be a note
    const noteFrequencies = peakFrequencies.filter(function (peak) {
      return peak > 20 && dataArray[peak] > 140;
    });

    // Order the peak frequencies from highest to lowest
    noteFrequencies.sort(function (a, b) {
      return dataArray[b] - dataArray[a];
    });

    // translate the peak frequencies to actual frequencies
    const nyquist = audioContext.sampleRate / 2;
    const frequencyData = noteFrequencies.map(function (peak) {
      return peak * nyquist / bufferLength;
    });

    // Translate the peak frequencies to actual notes
    const notes = frequencyData.map(function (frequency) {
      const note = 12 * (Math.log(frequency / 440) / Math.log(2));
      return Math.round(note) + 69;
    });

    // Translate the notes to actual note names
    const allNoteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const playingNoteNames = notes.map(function (note) {
      const noteName = allNoteNames[note % 12];
      const octave = Math.floor(note / 12) - 1;
      return noteName + octave;
    });

    for (const note of playingNoteNames) {
      this.playingKeys[note] = time;
      this.piano.keyDown(note);
    }

    for (const note in this.playingKeys) {
      if (this.playingKeys[note] < time - 100) {
        delete this.playingKeys[note];
        this.piano.keyUp(note);
      }
    }
  }
}

export class HarmonyViz {
  name = "Harmony";

  constructor(targetElement) {
    this.textElement = document.createElement('div');
    targetElement.appendChild(this.textElement);
  }

  draw({ bufferLength, dataArray, audioContext }) {
    const peakFrequencies = [];

    // Find the 10 highest peaks in the frequency data
    for (let i = 0; i < 10; i++) {
      let max = 0;
      let maxIndex = 0;
      for (let j = 0; j < bufferLength; j++) {
        if (dataArray[j] > max && !peakFrequencies.includes(j)) {
          max = dataArray[j];
          maxIndex = j;
        }
      }
      peakFrequencies.push(maxIndex);
    }

    // Order the peak frequencies from highest to lowest
    peakFrequencies.sort(function (a, b) {
      return dataArray[b] - dataArray[a];
    });

    // translate the peak frequencies to actual frequencies
    const nyquist = audioContext.sampleRate / 2;
    const frequencyData = peakFrequencies.map(function (peak) {
      return peak * nyquist / bufferLength;
    });

    // Translate the peak frequencies to actual notes
    const notes = frequencyData.map(function (frequency) {
      const note = 12 * (Math.log(frequency / 440) / Math.log(2));
      return Math.round(note) + 69;
    });

    // Translate the notes to actual note names
    const noteNames = notes.map(function (note) {
      const noteName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][note % 12];
      const octave = Math.floor(note / 12) - 1;
      return noteName + octave;
    });

    const chord = Tonal.Chord.detect(noteNames, { assumePerfectFifth: true }).join(' ');

    if (chord) {
      this.textElement.textContent = `The currently playing chord seems to be ${chord}`;
    }
  }
}
