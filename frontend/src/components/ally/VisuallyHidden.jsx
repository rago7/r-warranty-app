export default function VisuallyHidden({ as: Tag = 'span', children }) {
    return (
        <Tag className="sr-only">{children}</Tag>
    )
}