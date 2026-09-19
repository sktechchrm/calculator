// Wraps the standalone Relay call app (public/relay.html) in an iframe.
// Kept as plain HTML/JS rather than ported to React because its WebRTC
// state (peer connection, local/remote streams, ICE lifecycle) is easier
// to reason about — and safer to keep working — as the self-contained
// vanilla app it already is, tested and running on its own.
export default function CallScreen() {
  return (
    <iframe
      src="/relay.html"
      title="Relay — Direct Call"
      // camera/microphone/clipboard must be explicitly delegated to an
      // iframe, or getUserMedia() and the paste/share buttons inside it
      // will silently fail even though the parent page has no issue.
      allow="camera; microphone; clipboard-read; clipboard-write; autoplay"
      style={{
        width: '100%', height: '100%', border: 'none',
        background: '#05080c', display: 'block',
      }}
    />
  );
}