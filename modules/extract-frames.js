const extFrames = require('ffmpeg-extract-frames')
const fs = require('fs')
const prog = require('cli-progress')

module.exports = async () => {
	if (!fs.existsSync('./frames')) {
		fs.mkdirSync('./frames')
	} else {
		fs.rmSync('./frames', { recursive: true })
		fs.mkdirSync('./frames')
	}

	await extFrames({
		input: './bad-apple.mp4',
		output: './frames/%d.png'
	})
}