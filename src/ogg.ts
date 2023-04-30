import axios from 'axios';
import * as fs from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import installer from '@ffmpeg-installer/ffmpeg';
import { removeFile } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
class OggConverter {
  constructor() {
    ffmpeg.setFfmpegPath(installer.path);
  }
  toMp3(input: string, output: string): Promise<string> | undefined {
    try {
      const outputPath = resolve(dirname(input), `${output}.mp3`);
      return new Promise((resolve, reject) => {
        ffmpeg(input)
          .inputOption('-t 30')
          .output(outputPath)
          .on('end', async () => {
            await removeFile(input);
            resolve(outputPath);
          })
          .on('error', (err) => reject(err.message))
          .run();
      });
    } catch (e: any) {
      console.log('Error while creating mp3', e.message);
    }
  }
  async create(url: string, fileName: string): Promise<Promise<string> | undefined> {
    try {
      const oggFile = resolve(__dirname, '../voices', `${fileName}.ogg`);
      const response = await axios({
        method: 'get',
        url,
        responseType: 'stream',
      });
      return new Promise((resolve) => {
        const stream = fs.createWriteStream(oggFile);
        response.data.pipe(stream);
        stream.on('finish', () => {
          resolve(oggFile);
        });
      });
    } catch (e: any) {
      console.log(`Error while creating ogg`, e.message);
    }
  }
}

export const ogg = new OggConverter();
