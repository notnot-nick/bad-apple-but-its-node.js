const fs = require('fs');
const prog = require('cli-progress');
const sharp = require('sharp');
const driftless = require('driftless');
const lame = require('@suldashi/lame');
const Speaker = require('speaker');
const vol = require('pcm-volume')
const arg = require('argparse')
const sbt = require('subtitles-parser')

const parser = new arg.ArgumentParser()

parser.add_argument('-p', '--process', { help: 'Force processing frames to ASCII', action: 'store_true' })
parser.add_argument('-e', '--extract', { help: 'Force extracting frames from MP4', action: 'store_true' })
parser.add_argument('-d', '--debug', { help: 'Debug mode', action: 'store_true' })
parser.add_argument('-s', '--subtitles', { help: 'Subtitles', choices: ['en'] })
parser.add_argument('-v', '--volume', { help: 'Volume' })

const args = parser.parse_args()

const config = {
	processNew: args.process ? args.process : false,
	sizeFrame: [240, 72]
};

const bar = new prog.SingleBar({}, prog.Presets.shades_classic);

async function main() {
	console.log('Something in ASCII')
	let extf = false
	let prcFrames
	let subt
	if (!fs.existsSync('./frames')) {
		await require('./modules/extract-frames')()
		extf = true
		console.log('Finished extracting frames')
	}
	if (!fs.existsSync('./processed')) {
		prcFrames = await require('./modules/process-frames')(config)
		console.log('Finished processing frames')
		await new Promise((r) => setTimeout(r, 1000));
	}
	if (!extf && args.extract) {
		await require('./modules/extract-frames')()
		extf = true
		console.log('Finished extracting frames')
	}
	if (!prcFrames && args.process) {
		prcFrames = await require('./modules/process-frames')(config)
		console.log('Finished processing frames')
		await new Promise((r) => setTimeout(r, 1000));
	}
	if (!prcFrames) {
		prcFrames = []
		const frames = fs.readdirSync('./processed').sort((a, b) => Number(a.replace(/\D/g, '') - Number(b.replace(/\D/g, ''))))
		
		bar.start(frames.length, 0);
		let i = 0;
		frames.forEach((r) => {
			const f = fs.readFileSync(`./processed/${r}`, {
				encoding: 'utf-8',
			});
			prcFrames.push(f);
			i++;
			bar.update(i);
		});
		bar.stop();
		console.log('Finished reading pre-processed frames')
		await new Promise((r) => setTimeout(r, 1000));
	}
	if (args.subtitles) {
		switch (args.subtitles) {
			case 'en':
				subt = sbt.fromSrt(fs.readFileSync('./srt/en.srt', { encoding: 'utf-8' }), true)
				break
			case 'jp':
				subt = sbt.fromSrt(fs.readFileSync('./srt/jp.srt', { encoding: 'utf-8' }), true)
		}
	}

	console.clear()
	bar.start(prcFrames.length, 0)

	const volu = new vol()
	volu.setVolume(args.volume ? args.volume / 100 : 0.25)
	const dec = new lame.Decoder()
	volu.pipe(new Speaker())
	dec.pipe(volu)

	fs.createReadStream('./bad-apple.mp3').pipe(dec)

	let int = 0;
	driftless.setDriftlessInterval(() => {
		process.stdout.cursorTo(0, 0);
		process.stdout.write(prcFrames[int]);
		int++;
		if (subt) {
			const time = Math.round(int / 30 * 1000)
			const st = subt.find(r => {
				return r.startTime <= time && r.endTime >= time
			})
			st !== undefined ? console.log(st.text.padEnd(240, ' ')) : console.log(' '.padEnd(240, ' '))
		}

		if (int > prcFrames.length) {
			setTimeout(() => {
				process.exit(0)
			}, 1000)
		}
		bar.update(int);
	}, 1000 / 30);
}

main()

if (!args.debug) {
	process.on('exit', () => {
		console.clear();
		process.exit(0);
	});
	
	process.on('SIGINT', function () {
		console.clear();
		process.exit(0);
	});
}