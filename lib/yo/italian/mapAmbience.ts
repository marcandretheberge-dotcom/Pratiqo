/** Quiet procedural breeze/water. Explicit opt-in; independent of lesson audio. */
export class ItalianMapAmbience {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private disposed = false;
  async start() {
    if(this.disposed)return false;
    try {
      const Ctor=window.AudioContext ?? (window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(!Ctor)return false;
      if(!this.context) {
        const context=this.context=new Ctor();
        const buffer=context.createBuffer(1,context.sampleRate*6,context.sampleRate), data=buffer.getChannelData(0);
        let smooth=0;
        for(let i=0;i<data.length;i++) {
          smooth=(smooth+.025*(Math.random()*2-1))/1.025;
          const phase=i/data.length*Math.PI*2;
          data[i]=smooth*(.6-.4*Math.cos(phase));
        }
        const source=this.source=context.createBufferSource(); source.buffer=buffer; source.loop=true;
        const filter=context.createBiquadFilter(); filter.type="lowpass";filter.frequency.value=900;
        const gain=this.gain=context.createGain();gain.gain.value=0;
        source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start();
      }
      await this.context.resume();
      return !this.disposed && this.context.state==="running";
    } catch { return false; }
  }
  setAudible(audible:boolean) {
    if(!this.context || !this.gain || this.disposed)return;
    this.gain.gain.setTargetAtTime(audible?.22:0,this.context.currentTime,.12);
  }
  dispose() {
    this.disposed=true;
    try {this.source?.stop();this.source?.disconnect();void this.context?.close();}catch{/* Already stopped. */}
    this.source=null;this.gain=null;this.context=null;
  }
}
