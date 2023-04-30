import { Configuration, OpenAIApi } from 'openai';
import config from 'config';
import { createReadStream, PathLike } from 'fs';
import { ChatCompletionRequestMessage } from 'openai/api.js';

class Openai {
  private openai: OpenAIApi;
  roles = {
    ASSISTANT: 'assistant',
    USER: 'user',
    SYSTEM: 'system',
  };
  constructor(apiKey: string) {
    const configuration = new Configuration({ apiKey });
    this.openai = new OpenAIApi(configuration);
  }
  async chat(messages: Array<ChatCompletionRequestMessage>) {
    try {
      const response = await this.openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages,
      });
      return response.data.choices[0].message;
    } catch (e: any) {
      console.log('Error while chat', e.message);
    }
  }
  async transcription(filepath: PathLike) {
    try {
      const response = await this.openai.createTranscription(createReadStream(filepath), 'whisper-1');
      return response.data.text;
    } catch (e: any) {
      console.log('Error while transcription', e.message);
    }
  }
}

export const openai = new Openai(config.get('OPENAI_KEY'));
