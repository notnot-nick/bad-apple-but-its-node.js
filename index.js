const fs = require('fs');
const prog = require('cli-progress');
const sharp = require('sharp');
const driftless = require('driftless');
const lame = require('@suldashi/lame');
const Speaker = require('speaker');
const vol = require('pcm-volume')
const arg = require('argparse')

const parser = new arg.ArgumentParser()

parser.add_argument('-p', '--process', { help: 'Force processing frames to ASCII' })
parser.add_argument('-e', '--extract', { help: 'Force extracting frames from MP4' })

const args = parser.parse_args()

const config = {
	processNew: args.process ? args.process : false,
	sizeFrame: [180, 72]
};

const bar = new prog.SingleBar({}, prog.Presets.shades_classic);

async function main() {
	console.log('Bad Apple!! in ASCII')
	let extf = false
	let prcFrames
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
	if (!prcFrames && args.process) {
		prcFrames = await require('./modules/process-frames')(config)
		console.log('Finished processing frames')
		await new Promise((r) => setTimeout(r, 1000));
	}
	if (!extf && args.extract) {
		await require('./modules/extract-frames')()
		extf = true
		console.log('Finished extracting frames')
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

	console.clear()
	bar.start(prcFrames.length, 0)

	const volu = new vol()
	volu.setVolume(0.25)
	const dec = new lame.Decoder()
	volu.pipe(new Speaker())
	dec.pipe(volu)

	fs.createReadStream('./bad-apple.mp3').pipe(dec)

	let int = 0;
	driftless.setDriftlessInterval(() => {
		process.stdout.cursorTo(0, 0);
		process.stdout.write(prcFrames[int]);
		int++;
		if (int > prcFrames.length) {
			process.exit(0)
		}
		bar.update(int);
	}, 1000 / 30);
}

main()

process.on('exit', () => {
	console.clear();
	process.exit(0);
});

process.on('SIGINT', function () {
	console.clear();
	process.exit(0);
});