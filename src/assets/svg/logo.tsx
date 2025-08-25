import { SVGProps } from 'react'

const AppLogo = ({ className }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={className}
      width="32"
      height="48"
      viewBox="0 0 32 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.5086 9.54713C14.5086 4.25262 18.4857 1.43757 20.4742 0.691868C16.0932 -1.35882 0.340168 0.69187 0.340168 13.0892C0.340168 26.1391 18.4235 26.6984 18.4235 38.1636C18.4235 43.309 14.0736 46.5217 11.8986 47.4849C20.8471 49.722 31.6598 44.5953 31.6598 33.5962C31.6598 22.597 14.5086 19.8006 14.5086 9.54713Z"
        fill="#232323"
      />
    </svg>
  )
}

export default AppLogo
