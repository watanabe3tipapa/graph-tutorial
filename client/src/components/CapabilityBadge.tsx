export type CapabilityKind = 'demo' | 'local' | 'admin' | 'disabled'

const LABELS: Record<CapabilityKind, string> = {
  demo: 'このページで試せます',
  local: 'ローカルで実行',
  admin: '運用者向け',
  disabled: '実験機能・公開停止中',
}

interface Props {
  kind: CapabilityKind
}

function CapabilityBadge({ kind }: Props) {
  return <span className={`cap-badge cap-${kind}`}>{LABELS[kind]}</span>
}

export default CapabilityBadge
