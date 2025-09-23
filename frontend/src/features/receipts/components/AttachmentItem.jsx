export default function AttachmentItem({ file }) {
    const isImage = file.type === 'image'
    return (
        <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="group block overflow-hidden rounded-lg border border-slate-200 bg-white"
            title={file.filename}
        >
            {isImage ? (
                <img src={file.url} alt={file.filename} className="h-32 w-full object-cover transition group-hover:opacity-90" />
            ) : (
                <div className="flex h-32 items-center justify-center text-slate-700">
                    <span className="text-sm">{file.filename}</span>
                </div>
            )}
            <div className="border-t border-slate-200 p-2 text-xs text-slate-600">{file.filename}</div>
        </a>
    )
}