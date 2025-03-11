import { Field as ArkField } from '@ark-ui/solid'
import { createForm, getValues, required, reset } from '@modular-forms/solid'

import { Button } from '@/components/button'
import { Card, CardContent } from '@/components/card'
import { useDrizzle } from '@/components/drizzle'
import { Input } from '@/components/input'
import { getSettings, setSettings } from '@/dal'
import { Settings } from '@/types'
import { createEffect, createResource, Show, Suspense } from 'solid-js'

export default function AccountsSettings() {
  const context = useDrizzle()

  const [formStore, { Form, Field }] = createForm<Settings>({
    initialValues: {
      hostname: '127.0.0.1',
      port: 3000,
      username: 'admin',
      password: 'admin',
    },
  })

  const [initialSettings] = createResource<Settings>(() => getSettings(context.db, ['hostname', 'port', 'username', 'password']))

  createEffect(() => {
    console.log('initialSettings', initialSettings())
    reset(formStore, {
      initialValues: initialSettings(),
    })
  })

  const [submitData] = createResource(
    () => formStore.submitCount || null,
    async () => {
      await setSettings(context.db, getValues(formStore))
    }
  )

  return (
    <>
      <div class="flex flex-col gap-4 p-4 max-w-[800px]">
        <Card>
          <CardContent>
            <Suspense fallback={<div>Loading...</div>}>
              <Show when={submitData.loading}>
                <p>Loading...</p>
              </Show>
            </Suspense>
            <Form
              onSubmit={(e) => {
                console.log('eee', e)
                // setFormValues(e)
              }}
              class="flex flex-col gap-4"
            >
              <Field name="hostname" validate={[required('Hostname is required.')]}>
                {(field, props) => {
                  console.log(props, field)
                  return (
                    <ArkField.Root>
                      <ArkField.Label>Hostname</ArkField.Label>
                      <Input {...props} value={field.value} />
                      {/* <ArkField.HelperText>Some additional Info</ArkField.HelperText> */}
                      {field.error && <ArkField.ErrorText>{field.error}</ArkField.ErrorText>}
                    </ArkField.Root>
                  )
                }}
              </Field>
              <Field type="number" name="port" validate={[required('Port is required.')]}>
                {(field, props) => {
                  return (
                    <ArkField.Root>
                      <ArkField.Label>Port</ArkField.Label>
                      <Input {...props} value={field.value} />
                      {field.error && <ArkField.ErrorText>{field.error}</ArkField.ErrorText>}
                    </ArkField.Root>
                  )
                }}
              </Field>

              <Field name="username" validate={[required('Username is required.')]}>
                {(field, props) => {
                  return (
                    <ArkField.Root>
                      <ArkField.Label>Username</ArkField.Label>
                      <Input {...props} value={field.value} />
                      {field.error && <ArkField.ErrorText>{field.error}</ArkField.ErrorText>}
                    </ArkField.Root>
                  )
                }}
              </Field>

              <Field name="password" validate={[required('Password is required.')]}>
                {(field, props) => {
                  return (
                    <ArkField.Root>
                      <ArkField.Label>Password</ArkField.Label>
                      <Input {...props} value={field.value} />
                      {field.error && <ArkField.ErrorText>{field.error}</ArkField.ErrorText>}
                    </ArkField.Root>
                  )
                }}
              </Field>

              <Button type="submit">Save</Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
