import { getApiUrl, doExtrasFetch } from '../../../extensions.js';
export { WhisperCppSttProvider };

const DEBUG_PREFIX = '<Speech Recognition module (Whisper.cpp)> ';

class WhisperCppSttProvider {
    //########//
    // Config //
    //########//

    settings;

    defaultSettings = {
        server_url: 'http://127.0.0.1:8098',
        language: '',
    };

    get settingsHtml() {
        let html = '<div><i>Enter your whisper.cpp server URL (default: http://127.0.0.1:8098)</i></div>';
        html += `<input type="text" id="whisper_cpp_server_url" class="form-control" placeholder="http://127.0.0.1:8098" />`;
        return html;
    }

    onSettingsChange() {
        this.settings.server_url = $('#whisper_cpp_server_url').val().trim();
        console.debug(DEBUG_PREFIX + 'Server URL updated: ' + this.settings.server_url);
    }

    loadSettings(settings) {
        if (Object.keys(settings).length == 0) {
            console.debug(DEBUG_PREFIX + 'Using default Whisper.cpp STT extension settings');
        }

        this.settings = { ...this.defaultSettings };

        for (const key in settings) {
            if (key in this.settings) {
                this.settings[key] = settings[key];
            } else {
                console.warn(DEBUG_PREFIX + `Unknown setting ignored: ${key}`);
            }
        }

        $('#speech_recognition_language').val(this.settings.language);
        $('#whisper_cpp_server_url').val(this.settings.server_url);
        console.debug(DEBUG_PREFIX + 'Whisper.cpp STT settings loaded');
    }

    async processAudio(audioBlob) {
        const serverUrl = this.settings.server_url.replace(/\/+$/, '');

        const requestData = new FormData();
        requestData.append('audiofile', audioBlob, 'record.wav');

        if (this.settings.language && this.settings.language.trim() !== '') {
            requestData.append('language', this.settings.language);
        }

        const url = `${serverUrl}/inference`;

        console.debug(DEBUG_PREFIX + `Sending audio to ${url}`);

        const apiResult = await fetch(url, {
            method: 'POST',
            body: requestData,
        });

        if (!apiResult.ok) {
            const errorText = await apiResult.text();
            toastr.error(`Whisper.cpp server returned ${apiResult.status}: ${errorText}`, 'STT Generation Failed (Whisper.cpp)', { timeOut: 10000, extendedTimeOut: 20000, preventDuplicates: true });
            throw new Error(`HTTP ${apiResult.status}: ${errorText}`);
        }

        const result = await apiResult.json();

        // whisper.cpp returns { "text": "transcription" }
        if (!result.text) {
            toastr.error('No transcription text returned from Whisper.cpp server.', 'STT Generation Failed (Whisper.cpp)', { timeOut: 10000, extendedTimeOut: 20000, preventDuplicates: true });
            throw new Error('Empty transcription result');
        }

        return result.text;
    }
}
