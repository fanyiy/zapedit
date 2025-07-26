import Image from "next/image";

const sampleImages = [
  {
    url: "https://i.ibb.co/LdNQT9r4/image.png",
    width: 1012,
    height: 674,
  },
  {
    url: "https://images.unsplash.com/photo-1751210392423-d8988823cb6d?q=80&w=1335&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    width: 669,
    height: 892,
  },
  {
    url: "https://images.unsplash.com/photo-1751755360008-6c3f5fb1dad6?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwzNDh8fHxlbnwwfHx8fHw%3D",
    width: 713,
    height: 892,
  },
  {
    url: "https://plus.unsplash.com/premium_photo-1752192844294-35fb57ae49be?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHx0b3BpYy1mZWVkfDF8dG93SlpGc2twR2d8fGVufDB8fHx8fA%3D%3D",
    width: 792,
    height: 528,
  },
];

export function SampleImages({
  onSelect,
}: {
  onSelect: ({
    url,
    width,
    height,
  }: {
    url: string;
    width: number;
    height: number;
  }) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-white mb-2">
          Sample images
        </h3>
        <p className="text-muted-foreground text-sm">
          Or try one of these examples
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {sampleImages.map((sample, index) => (
          <button
            key={sample.url}
            className="group relative overflow-hidden rounded-xl border border-border hover:border-muted-foreground transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            onClick={() => {
              onSelect({
                url: sample.url,
                width: sample.width,
                height: sample.height,
              });
            }}
          >
            <Image
              src={sample.url}
              width={sample.width}
              height={sample.height}
              alt={`Sample image ${index + 1}`}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <p className="text-white text-sm font-medium">Use this image</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}