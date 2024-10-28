import type { PropsWithChildren } from "react"
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react"
import { Amplify } from "aws-amplify"
import { useCallback } from "react"
import "@aws-amplify/ui-react/styles.css"

interface AmplifyShellProps {
  outputs: Record<string, unknown>
  title: string
}

function AmplifyShell(props: PropsWithChildren<AmplifyShellProps>) {
  const configure = useCallback(() => {
    Amplify.configure(props.outputs)
  }, [props.outputs])

  configure()

  return (
    <>
      <h1>{props.title}</h1>
      <Authenticator>{props.children}</Authenticator>
    </>
  )
}

function Main() {
  const { user } = useAuthenticator()

  return (
    <section>
      <p>Hello {user.signInDetails?.loginId}</p>
    </section>
  )
}

interface AppProps extends AmplifyShellProps {}

export function App(props: AppProps) {
  return (
    <AmplifyShell outputs={props.outputs} title={props.title}>
      <Main />
    </AmplifyShell>
  )
}
