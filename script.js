document.addEventListener('DOMContentLoaded', function() {
    console.log('スクリプト読み込み完了');
    
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const playerSection = document.getElementById('playerSection');
    const audioPlayer = document.getElementById('audioPlayer');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const fileSizeDisplay = document.getElementById('fileSizeDisplay');
    const fileTypeDisplay = document.getElementById('fileTypeDisplay');
    
    // URL入力関連の要素
    const urlInput = document.getElementById('urlInput');
    const loadUrlBtn = document.getElementById('loadUrlBtn');
    const urlStatus = document.getElementById('urlStatus');
    
    // 再生方式関連の要素
    const playbackModeRadios = document.querySelectorAll('input[name="playbackMode"]');
    
    // 要素の存在確認
    if (!fileInput) {
        console.error('fileInput要素が見つかりません');
        return;
    }
    if (!audioPlayer) {
        console.error('audioPlayer要素が見つかりません');
        return;
    }
    
    console.log('必要な要素が見つかりました');

    // カスタムコントロール要素
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const progressHandle = document.getElementById('progressHandle');
    const currentTimeDisplay = document.getElementById('currentTime');
    const durationDisplay = document.getElementById('duration');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    const speedSelect = document.getElementById('speedSelect');
    const loopBtn = document.getElementById('loopBtn');
    const waveformCanvas = document.getElementById('waveform');
    const waveformCtx = waveformCanvas.getContext('2d');

    let audioContext;
    let analyser;
    let dataArray;
    let animationId;
    let isDragging = false;
    let mediaSource;
    let sourceBuffer;
    let audioBuffer;
    
    // 再生方式の状態管理
    let currentPlaybackMode = 'mediasource'; // デフォルト

    // 初期設定
    audioPlayer.volume = 0.5;
    
    // 再生方式の取得
    function getSelectedPlaybackMode() {
        const selectedRadio = document.querySelector('input[name="playbackMode"]:checked');
        return selectedRadio ? selectedRadio.value : 'mediasource';
    }
    
    // 再生方式変更イベント
    playbackModeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            currentPlaybackMode = this.value;
            console.log('再生方式を変更:', currentPlaybackMode);
        });
    });

    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        
        if (file) {
            fileName.textContent = file.name;
            
            const fileSize = formatFileSize(file.size);
            fileNameDisplay.textContent = file.name;
            fileSizeDisplay.textContent = fileSize;
            fileTypeDisplay.textContent = file.type || '不明';
            
            // 選択された再生方式で音声ファイルを読み込み
            loadAudioFile(file);
            
            playerSection.style.display = 'block';
        }
    });

    // URL読み込みボタンのイベントリスナー
    loadUrlBtn.addEventListener('click', async function() {
        const url = urlInput.value.trim();
        if (!url) {
            urlStatus.textContent = 'URLを入力してください';
            urlStatus.style.color = '#e74c3c';
            return;
        }
        
        urlStatus.textContent = '読み込み中...';
        urlStatus.style.color = '#3498db';
        
        try {
            await loadAudioFromUrl(url);
        } catch (error) {
            console.error('URL読み込みエラー:', error);
            urlStatus.textContent = '読み込みに失敗しました: ' + error.message;
            urlStatus.style.color = '#e74c3c';
        }
    });

    // URLからの音声ファイル読み込み
    async function loadAudioFromUrl(url) {
        try {
            console.log('URLから音声ファイルを読み込み中:', url);
            
            // fetch でファイルを取得
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Content-Type を取得
            const contentType = response.headers.get('content-type') || 'audio/mpeg';
            console.log('Content-Type:', contentType);
            
            // ArrayBuffer として取得
            const arrayBuffer = await response.arrayBuffer();
            console.log('取得したファイルサイズ:', arrayBuffer.byteLength, 'bytes');
            
            // ファイル情報を設定
            const urlParts = url.split('/');
            const filename = urlParts[urlParts.length - 1] || 'audio_file';
            
            fileName.textContent = filename;
            fileNameDisplay.textContent = filename;
            fileSizeDisplay.textContent = formatFileSize(arrayBuffer.byteLength);
            fileTypeDisplay.textContent = contentType;
            
            // 選択された再生方式で読み込み
            await loadAudioFromArrayBuffer(arrayBuffer, contentType, filename);
            
            playerSection.style.display = 'block';
            urlStatus.textContent = '読み込み完了';
            urlStatus.style.color = '#27ae60';
            
        } catch (error) {
            console.error('URL読み込みエラー:', error);
            throw error;
        }
    }

    // ファイルオブジェクトから音声を読み込む統合関数
    async function loadAudioFile(file) {
        currentPlaybackMode = getSelectedPlaybackMode();
        console.log('使用する再生方式:', currentPlaybackMode);
        
        if (currentPlaybackMode === 'mediasource') {
            await loadAudioWithMediaSource(file);
        } else {
            await loadAudioDirect(file);
        }
    }
    
    // ArrayBufferから音声を読み込む統合関数
    async function loadAudioFromArrayBuffer(arrayBuffer, mimeType, filename) {
        currentPlaybackMode = getSelectedPlaybackMode();
        console.log('使用する再生方式:', currentPlaybackMode);
        
        if (currentPlaybackMode === 'mediasource') {
            await loadAudioWithArrayBufferMediaSource(arrayBuffer, mimeType, filename);
        } else {
            await loadAudioWithArrayBufferDirect(arrayBuffer, mimeType, filename);
        }
    }
    
    // MediaSource方式：ArrayBufferから音声を読み込む
    async function loadAudioWithArrayBufferMediaSource(arrayBuffer, mimeType, filename) {
        try {
            console.log('ArrayBufferから音声ファイルを読み込み中...');
            
            // MediaSourceが対応しているかチェック
            if (!window.MediaSource) {
                console.warn('MediaSource未対応、従来の方法にフォールバック');
                fallbackToArrayBuffer(arrayBuffer, mimeType);
                return;
            }

            // ArrayBufferをコピー（decodeAudioDataで消費されるため）
            const arrayBufferForMediaSource = arrayBuffer.slice();
            const arrayBufferForAudioContext = arrayBuffer.slice();
            
            // AudioContextで音声データを処理
            if (!audioContext) {
                initAudioContext();
            }
            
            // ArrayBufferから音声データをデコード（コピーを使用）
            audioBuffer = await audioContext.decodeAudioData(arrayBufferForAudioContext);
            console.log('音声データのデコード完了');
            
            // MediaSourceを使用してaudio要素にセット（別のコピーを使用）
            await setupMediaSource(arrayBufferForMediaSource, mimeType);
            
            // メタデータ設定
            durationDisplay.textContent = formatTime(audioBuffer.duration);
            
        } catch (error) {
            console.error('ArrayBufferでの読み込みエラー:', error);
            console.log('従来の方法にフォールバック');
            fallbackToArrayBuffer(arrayBuffer, mimeType);
        }
    }
    
    // ダイレクト方式：ArrayBufferから音声を読み込む
    async function loadAudioWithArrayBufferDirect(arrayBuffer, mimeType, filename) {
        console.log('ダイレクト方式でArrayBufferから読み込み');
        fallbackToArrayBuffer(arrayBuffer, mimeType);
    }
    
    // ダイレクト方式：ファイルから音声を読み込む
    async function loadAudioDirect(file) {
        console.log('ダイレクト方式でファイルから読み込み');
        const fileURL = URL.createObjectURL(file);
        audioPlayer.src = fileURL;
        
        // オーディオコンテキストの初期化
        initAudioContext();
        
        audioPlayer.addEventListener('loadedmetadata', function() {
            durationDisplay.textContent = formatTime(audioPlayer.duration);
        });
        
        audioPlayer.addEventListener('error', function(e) {
            console.error('音声ファイルの読み込みエラー:', e);
            alert('音声ファイルの読み込みに失敗しました。対応している形式のファイルを選択してください。');
        });
    }

    // フォールバック: ArrayBufferからBlob作成
    function fallbackToArrayBuffer(arrayBuffer, mimeType) {
        console.log('ArrayBufferからBlob方式で読み込み');
        const blob = new Blob([arrayBuffer], { type: mimeType });
        const fileURL = URL.createObjectURL(blob);
        audioPlayer.src = fileURL;
        
        // オーディオコンテキストの初期化
        initAudioContext();
        
        audioPlayer.addEventListener('loadedmetadata', function() {
            durationDisplay.textContent = formatTime(audioPlayer.duration);
        });
        
        audioPlayer.addEventListener('error', function(e) {
            console.error('音声ファイルの読み込みエラー:', e);
            alert('音声ファイルの読み込みに失敗しました。対応している形式のファイルを選択してください。');
        });
    }

    // MediaSourceを使用した音声ファイル読み込み
    async function loadAudioWithMediaSource(file) {
        try {
            console.log('MediaSourceで音声ファイルを読み込み中...');
            
            // MediaSourceが対応しているかチェック
            if (!window.MediaSource) {
                console.warn('MediaSource未対応、従来の方法にフォールバック');
                fallbackToObjectURL(file);
                return;
            }

            // ファイルをArrayBufferとして読み込み
            const originalArrayBuffer = await file.arrayBuffer();
            console.log('ファイルサイズ:', originalArrayBuffer.byteLength, 'bytes');
            
            // ArrayBufferをコピー（decodeAudioDataで消費されるため）
            const arrayBufferForMediaSource = originalArrayBuffer.slice();
            const arrayBufferForAudioContext = originalArrayBuffer.slice();
            
            // AudioContextで音声データを処理
            if (!audioContext) {
                initAudioContext();
            }
            
            // ArrayBufferから音声データをデコード（コピーを使用）
            audioBuffer = await audioContext.decodeAudioData(arrayBufferForAudioContext);
            console.log('音声データのデコード完了');
            
            // MediaSourceを使用してaudio要素にセット（別のコピーを使用）
            await setupMediaSource(arrayBufferForMediaSource, file.type);
            
            // メタデータ設定
            durationDisplay.textContent = formatTime(audioBuffer.duration);
            
        } catch (error) {
            console.error('MediaSourceでの読み込みエラー:', error);
            console.log('従来の方法にフォールバック');
            fallbackToObjectURL(file);
        }
    }

    // MediaSourceのセットアップ
    async function setupMediaSource(arrayBuffer, mimeType) {
        return new Promise((resolve, reject) => {
            mediaSource = new MediaSource();
            const objectURL = URL.createObjectURL(mediaSource);
            audioPlayer.src = objectURL;
            audioPlayer.load();
            
            mediaSource.addEventListener('sourceopen', function() {
                try {
                    // MIMEタイプの調整
                    let sourceType = mimeType;
                    console.log('元のMIMEタイプ:', sourceType);
                    console.log('MediaSource.isTypeSupported(元):', MediaSource.isTypeSupported(sourceType));
                    
                    if (!MediaSource.isTypeSupported(sourceType)) {
                        console.log('元のMIMEタイプは未対応、フォールバックを試行');
                        
                        // 一般的な音声コーデックを試す
                        const fallbackTypes = [
                            'audio/mpeg',
                            'audio/mp4',
                            'audio/webm',
                            'audio/ogg'
                        ];
                        
                        console.log('フォールバックタイプをテスト:');
                        fallbackTypes.forEach(type => {
                            console.log(`  ${type}: ${MediaSource.isTypeSupported(type)}`);
                        });
                        
                        sourceType = fallbackTypes.find(type => MediaSource.isTypeSupported(type));
                        console.log('選択されたタイプ:', sourceType);
                        
                        if (!sourceType) {
                            console.error('対応するMIMEタイプが見つかりません');
                            throw new Error('対応するMIMEタイプが見つかりません');
                        }
                    }
                    
                    console.log('最終的に使用するMIMEタイプ:', sourceType);
                    
                    sourceBuffer = mediaSource.addSourceBuffer(sourceType);
                    
                    sourceBuffer.addEventListener('updateend', function() {
                        console.log('SourceBuffer updateend イベント');
                        console.log('sourceBuffer.updating:', sourceBuffer.updating);
                        console.log('mediaSource.readyState:', mediaSource.readyState);
                        
                        if (!sourceBuffer.updating && mediaSource.readyState === 'open') {
                            console.log('MediaSource終了処理を実行');
                            mediaSource.endOfStream();
                            console.log('MediaSource終了後の状態:', mediaSource.readyState);
                            resolve();
                        }
                    });
                    
                    sourceBuffer.addEventListener('error', function(e) {
                        console.error('SourceBuffer error:', e);
                        reject(e);
                    });
                    
                    console.log('ArrayBufferをSourceBufferに追加:', arrayBuffer.byteLength, 'bytes');
                    sourceBuffer.appendBuffer(arrayBuffer);
                    
                } catch (error) {
                    console.error('MediaSource setup error:', error);
                    reject(error);
                }
            });
            
            mediaSource.addEventListener('error', function(e) {
                console.error('MediaSource error:', e);
                reject(e);
            });
        });
    }

    // フォールバック: 従来のObjectURL方式
    function fallbackToObjectURL(file) {
        console.log('ObjectURL方式で読み込み');
        const fileURL = URL.createObjectURL(file);
        audioPlayer.src = fileURL;
        
        // オーディオコンテキストの初期化
        initAudioContext();
        
        audioPlayer.addEventListener('loadedmetadata', function() {
            durationDisplay.textContent = formatTime(audioPlayer.duration);
        });
        
        audioPlayer.addEventListener('error', function(e) {
            console.error('音声ファイルの読み込みエラー:', e);
            alert('音声ファイルの読み込みに失敗しました。対応している形式のファイルを選択してください。');
        });
    }

    // オーディオコンテキストの初期化
    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            
            const source = audioContext.createMediaElementSource(audioPlayer);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            waveformCanvas.width = waveformCanvas.offsetWidth;
            waveformCanvas.height = waveformCanvas.offsetHeight;
        }
    }

    // 波形ビジュアライザー
    function drawWaveform() {
        if (!analyser) return;
        
        animationId = requestAnimationFrame(drawWaveform);
        
        analyser.getByteFrequencyData(dataArray);
        
        waveformCtx.fillStyle = '#1a252f';
        waveformCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);
        
        const barWidth = (waveformCanvas.width / dataArray.length) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < dataArray.length; i++) {
            barHeight = (dataArray[i] / 255) * waveformCanvas.height * 0.8;
            
            const gradient = waveformCtx.createLinearGradient(0, waveformCanvas.height - barHeight, 0, waveformCanvas.height);
            gradient.addColorStop(0, '#3498db');
            gradient.addColorStop(1, '#2980b9');
            
            waveformCtx.fillStyle = gradient;
            waveformCtx.fillRect(x, waveformCanvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }

    // 再生/一時停止
    playBtn.addEventListener('click', function() {
        console.log('再生ボタンがクリックされました');
        console.log('audioPlayer.paused:', audioPlayer.paused);
        console.log('audioPlayer.src:', audioPlayer.src);
        console.log('audioPlayer.readyState:', audioPlayer.readyState);
        console.log('audioPlayer.duration:', audioPlayer.duration);
        
        if (audioPlayer.paused) {
            console.log('再生を開始します');
            audioPlayer.play()
                .then(() => {
                    console.log('再生が正常に開始されました');
                    playIcon.style.display = 'none';
                    pauseIcon.style.display = 'block';
                    drawWaveform();
                })
                .catch((error) => {
                    console.error('再生エラー:', error);
                    console.error('エラー詳細:', error.message);
                    alert('再生に失敗しました: ' + error.message);
                });
        } else {
            console.log('再生を一時停止します');
            audioPlayer.pause();
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            cancelAnimationFrame(animationId);
        }
    });

    // 10秒戻る
    prevBtn.addEventListener('click', function() {
        audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
    });

    // 10秒進む
    nextBtn.addEventListener('click', function() {
        audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 10);
    });

    // プログレスバーの更新
    audioPlayer.addEventListener('timeupdate', function() {
        if (!isDragging) {
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressFill.style.width = progress + '%';
            progressHandle.style.left = progress + '%';
            currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
        }
    });

    // プログレスバークリック
    progressBar.addEventListener('click', function(e) {
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = pos * audioPlayer.duration;
    });

    // プログレスハンドルのドラッグ
    progressHandle.addEventListener('mousedown', startDragging);
    document.addEventListener('mousemove', handleDragging);
    document.addEventListener('mouseup', stopDragging);

    function startDragging(e) {
        isDragging = true;
        e.preventDefault();
    }

    function handleDragging(e) {
        if (!isDragging) return;
        
        const rect = progressBar.getBoundingClientRect();
        let pos = (e.clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos));
        
        progressFill.style.width = (pos * 100) + '%';
        progressHandle.style.left = (pos * 100) + '%';
        currentTimeDisplay.textContent = formatTime(pos * audioPlayer.duration);
    }

    function stopDragging(e) {
        if (!isDragging) return;
        isDragging = false;
        
        const rect = progressBar.getBoundingClientRect();
        let pos = (e.clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos));
        
        audioPlayer.currentTime = pos * audioPlayer.duration;
    }

    // 音量調整
    volumeSlider.addEventListener('input', function() {
        audioPlayer.volume = this.value / 100;
        volumeValue.textContent = this.value + '%';
    });

    // 再生速度調整
    speedSelect.addEventListener('change', function() {
        audioPlayer.playbackRate = parseFloat(this.value);
    });

    // ループ切り替え
    loopBtn.addEventListener('click', function() {
        audioPlayer.loop = !audioPlayer.loop;
        this.classList.toggle('active');
    });

    // 再生終了時
    audioPlayer.addEventListener('ended', function() {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        cancelAnimationFrame(animationId);
    });

    // ユーティリティ関数
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) {
            return bytes + ' bytes';
        } else if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(2) + ' KB';
        } else if (bytes < 1024 * 1024 * 1024) {
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        } else {
            return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        }
    }

    // タッチデバイス対応
    progressHandle.addEventListener('touchstart', function(e) {
        isDragging = true;
        e.preventDefault();
    });

    document.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        
        const touch = e.touches[0];
        const rect = progressBar.getBoundingClientRect();
        let pos = (touch.clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos));
        
        progressFill.style.width = (pos * 100) + '%';
        progressHandle.style.left = (pos * 100) + '%';
        currentTimeDisplay.textContent = formatTime(pos * audioPlayer.duration);
    });

    document.addEventListener('touchend', function(e) {
        if (!isDragging) return;
        isDragging = false;
        
        const touch = e.changedTouches[0];
        const rect = progressBar.getBoundingClientRect();
        let pos = (touch.clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos));
        
        audioPlayer.currentTime = pos * audioPlayer.duration;
    });
});