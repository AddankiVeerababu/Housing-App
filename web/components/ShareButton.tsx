"use client";

type ShareButtonProps = {
  url: string;
  text: string;
};

export default function ShareButton({ url, text }: ShareButtonProps) {
  async function handleShare() {
    // native share first
    if (navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
        return;
      } catch {
        // user canceled — ignore
      }
    }

    // clipboard fallback
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        alert("Link copied!");
        return;
      } catch {
        // ignore and show raw link
      }
    }

    alert(url);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="rounded border px-3 py-1 text-sm hover:bg-white/10"
    >
      Share
    </button>
  );
}
