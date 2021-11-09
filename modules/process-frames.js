const fs = require('fs');
const asyncForEach = require('./asyncForEach');
const prog = require('cli-progress');
const sharp = require('sharp')
const charset = ['.', ',', ':', ';', '+', '*', '?', '%', 'S', '#', '@'];

module.exports = async (cfg) => {
	if (!fs.existsSync('./frames')) {
		await require('./extract-frames')();
	}
	if (!fs.existsSync('./processed')) {
		fs.mkdirSync('./processed')
	} else {
		fs.rmSync('./processed', { recursive: true })
		fs.mkdirSync('./processed')
	}

	const bar = new prog.SingleBar({}, prog.Presets.shades_classic);

	const frames = fs.readdirSync('./frames').sort((a, b) => Number(a.replace(/[A-Za-z]/g, '')) - Number(b.replace(/[A-Za-z]/g, '')));
	const asciiFrames = []
	console.log('Processing frames into ASCII')
	bar.start(frames.length, 0);
	let i = 0
	await asyncForEach(frames, async (r) => {
		const frame = fs.readFileSync(`./frames/${r}`);
		const data = await sharp(frame).resize(cfg.sizeFrame[0], cfg.sizeFrame[1], {
			fit: 'fill'
		}).removeAlpha().raw().toBuffer();
		let iterX = 0;
		let iterY = 0;
		let final = '';
		for (let i = 0; i < data.length; i += 3) {
			const char = charset[Math.round(data[i] / 25.5)];
			final += char;
			iterX++;
			if (iterX >= cfg.sizeFrame[0]) {
				final += '\n';
				iterY++;
				iterX = 0;
			}
		}
		fs.writeFileSync(`./processed/${i}.txt`, final);
		asciiFrames.push(final);
		i++;
		bar.update(i);
	});
	bar.stop()
	return asciiFrames
};
