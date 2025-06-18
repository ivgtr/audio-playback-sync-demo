# 音声再生位置のズレを解決するMediaSourceを使ったデモ

HTML5 Audioの再生位置変更時に発生するズレ問題と、MediaSource Extensionsを使った解決策のデモンストレーションです。

## 問題の概要

標準的な音声ファイル読み込み（ObjectURL方式）では、シーク操作（再生位置の変更）を行った際に以下の問題が発生します：

### 発生する問題
- **再生位置のズレ**: `audio.currentTime`で設定した位置と実際の再生位置が異なる
- **同期の困難**: 複数の音声ファイルや視覚的要素との同期が取れない
- **精度の低下**: 音楽制作やオーディオアプリケーションでの正確な制御が困難

### 問題の原因
1. **バッファリング処理**: ブラウザ内部でのデータ読み込みタイミングの差
2. **デコード遅延**: 音声コーデックの処理時間による遅延
3. **メモリ配置**: ファイル全体が連続してメモリに配置されていない場合の読み込み遅延

## 解決策：MediaSource Extensions

MediaSource Extensions（MSE）を使用することで、これらの問題を軽減できます。

### MediaSource方式の利点
- **データの事前準備**: 音声データを事前にArrayBufferとして準備
- **精密な制御**: SourceBufferによる詳細なデータ管理
- **再生位置の精度向上**: メモリ上での連続データアクセス

## デモの使用方法

1. **再生方式を選択**
   - **MediaSource方式**: 改善された方式
   - **ダイレクト方式**: 標準的な方式（比較用）

2. **音声ファイルを読み込み**
   - ローカルファイルのアップロード
   - URLからの直接読み込み

3. **再生位置の変更でズレを確認**
   - プログレスバーをドラッグして再生位置を変更
   - 波形ビジュアライザーで実際の再生位置を確認

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 にアクセス

## 対応ブラウザ

- **Chrome 88+**: 動作確認済み

*他のブラウザでの動作は未検証です。

## 技術的な詳細

### 実装の違い

**ダイレクト方式（標準）**
```javascript
audio.src = URL.createObjectURL(file);
```

**MediaSource方式（改善）**
```javascript
const arrayBuffer = await file.arrayBuffer();
const mediaSource = new MediaSource();
const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
sourceBuffer.appendBuffer(arrayBuffer);
audio.src = URL.createObjectURL(mediaSource);
```

### 検証ポイント
- シーク操作の応答速度
- 設定位置と実際の再生位置の差異
- 連続したシーク操作での精度

## ライセンス

MIT License