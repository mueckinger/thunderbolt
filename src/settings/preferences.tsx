import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDrizzle } from '@/db/provider'
import { settingsTable } from '@/db/tables'
import { eq, sql } from 'drizzle-orm'

import axios from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface LocationData {
  name: string
  city: string
  coordinates: {
    lat: number
    lng: number
  }
}

const formSchema = z.object({
  locationName: z.string().min(1, { message: 'Location is required.' }),
  locationLat: z.string().min(1, { message: 'Latitude is required.' }),
  locationLng: z.string().min(1, { message: 'Longitude is required.' }),
})

export default function PreferencesSettingsPage() {
  const { db } = useDrizzle()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [locations, setLocations] = React.useState<LocationData[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [showSaved, setShowSaved] = React.useState(false)

  // Get any existing location settings from the database
  const { data: locationSettings, isLoading } = useQuery({
    queryKey: ['settings', 'location'],
    queryFn: async () => {
      const nameData = await db.select().from(settingsTable).where(eq(settingsTable.key, 'location_name'))
      const latData = await db.select().from(settingsTable).where(eq(settingsTable.key, 'location_lat'))
      const lngData = await db.select().from(settingsTable).where(eq(settingsTable.key, 'location_lng'))

      return {
        locationName: nameData[0]?.value || '',
        locationLat: latData[0]?.value || '',
        locationLng: lngData[0]?.value || '',
      }
    },
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      locationName: '',
      locationLat: '',
      locationLng: '',
    },
  })

  // Update form when data is loaded
  React.useEffect(() => {
    if (locationSettings) {
      form.reset({
        locationName: locationSettings.locationName as string,
        locationLat: locationSettings.locationLat as string,
        locationLng: locationSettings.locationLng as string,
      })
    }
  }, [locationSettings, form])

  // Debounced search for locations
  React.useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true)
        try {
          const response = await axios.get(`/locations?search=${encodeURIComponent(searchQuery)}`)
          if (response.data.success) {
            setLocations(response.data.data)
          }
        } catch (error) {
          console.error('Error searching locations:', error)
        } finally {
          setIsSearching(false)
        }
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [searchQuery])

  // Save location settings mutation
  const saveLocationMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      // Upsert approach - delete and insert
      await db.delete(settingsTable).where(sql`${settingsTable.key} IN ('location_name', 'location_lat', 'location_lng')`)

      await db.insert(settingsTable).values([
        { key: 'location_name', value: values.locationName },
        { key: 'location_lat', value: values.locationLat },
        { key: 'location_lng', value: values.locationLng },
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'location'] })
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 2000)
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setShowSaved(false)
    await saveLocationMutation.mutateAsync(values)
  }

  const handleSelectLocation = (location: LocationData) => {
    form.setValue('locationName', location.name)
    form.setValue('locationLat', String(location.coordinates.lat))
    form.setValue('locationLng', String(location.coordinates.lng))
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-4 p-4 w-full max-w-[760px] mx-auto">
      <h2 className="text-xl font-bold">Preferences</h2>

      <h3 className="text-lg font-semibold">Location</h3>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="locationName"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Location</FormLabel>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" role="combobox" aria-expanded={open} className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}>
                            {field.value || 'Select location...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-full" align="start">
                        <Command>
                          <CommandInput placeholder="Search for locations..." value={searchQuery} onValueChange={setSearchQuery} />
                          {isSearching && <div className="py-6 text-center text-sm">Searching...</div>}
                          {!isSearching && (
                            <>
                              <CommandEmpty>No locations found.</CommandEmpty>
                              <CommandGroup>
                                {locations.map((location) => (
                                  <CommandItem key={`${location.coordinates.lat}-${location.coordinates.lng}`} value={location.name} onSelect={() => handleSelectLocation(location)}>
                                    <Check className={cn('mr-2 h-4 w-4', location.name === field.value ? 'opacity-100' : 'opacity-0')} />
                                    {location.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          )}
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>Select your location to enable location-based features.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={saveLocationMutation.isPending}>
                  {saveLocationMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                {showSaved && <span className="ml-3 text-sm text-green-500 flex items-center">Settings saved!</span>}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
