import { useEffect } from "preact/hooks";
import { capabilities, isSupported } from "../platform/capabilities.ts";
import { Home } from "../ui/screens/Home.tsx";
import { Reader } from "../ui/screens/Reader.tsx";
import { Resume } from "../ui/screens/Resume.tsx";
import { Unsupported } from "../ui/screens/Unsupported.tsx";
import { UpdateNotice } from "../ui/components/UpdateNotice.tsx";
import { openAnotherFolder, openDemo, session, startSession } from "./session.ts";

const supported = isSupported(capabilities);

export function App() {
  return (
    <>
      <Screen />
      <UpdateNotice />
    </>
  );
}

function Screen() {
  useEffect(() => {
    if (supported) void startSession();
  }, []);

  const current = session.value;
  // The browser honours `autofocus` once per page; moving between screens needs a hand.
  useEffect(() => {
    document.querySelector<HTMLElement>("[autofocus]")?.focus();
  }, [current.kind]);

  if (!supported) return <Unsupported />;
  switch (current.kind) {
    case "loading":
      return null;
    case "home":
      return <Home onOpen={() => void openAnotherFolder()} onDemo={() => void openDemo()} />;
    case "resume":
      return <Resume record={current.record} permission={current.permission} />;
    case "reading":
      return (
        <Reader
          key={current.record.id}
          record={current.record}
          fs={current.fs}
          onLoad={current.onLoad}
        />
      );
  }
}
