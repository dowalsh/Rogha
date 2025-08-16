// app/editor/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import type { SerializedEditorState } from "lexical";
import EditorClient from "./_EditorClient";

const EMPTY: SerializedEditorState = {
  root: {
    type: "root",
    version: 1,
    indent: 0,
    format: "",
    direction: "ltr",
    children: [
      {
        type: "paragraph",
        version: 1,
        indent: 0,
        format: "",
        direction: "ltr",
        children: [],
      },
    ],
  },
} as any;

export default async function NewEditorPage() {
  const user = await currentUser(); // same pattern as your Home page

  // Optional: if you want to hard-require sign-in here, you can redirect to /sign-in instead.
  // if (!user) redirect("/sign-in");

  return (
    <EditorClient
      initialSerializedState={EMPTY}
      initialPostId={null}
      initialVersion={null}
      initialStatus="DRAFT"
    />
  );
}
