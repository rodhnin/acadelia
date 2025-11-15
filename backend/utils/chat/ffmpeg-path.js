import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

// Configura rutas para ffmpeg y ffprobe usando los instaladores
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

console.log('FFmpeg configurado con:', {
  ffmpegPath: ffmpegInstaller.path,
  ffprobePath: ffprobeInstaller.path,
  version: ffmpegInstaller.version
});

export default ffmpeg;