import { useForm } from 'react-hook-form'

export type Filters = {
  n_platos: number
  excludeMeat: boolean
  excludePasta: boolean
}

interface Props {
  onSubmit: (data: Filters) => void
}

export function FilterForm({ onSubmit }: Props) {
  const { register, handleSubmit } = useForm<Filters>({
    defaultValues: { n_platos: 3, excludeMeat: false, excludePasta: false }
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label>N° de platos:</label>
        <input
          type="number"
          {...register('n_platos', { min: 1, max: 5 })}
          className="border p-1 ml-2 w-16"
        />
      </div>
      <div>
        <label>
          <input type="checkbox" {...register('excludeMeat')} />
          Excluir carne roja
        </label>
      </div>
      <div>
        <label>
          <input type="checkbox" {...register('excludePasta')} />
          Excluir pastas
        </label>
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Generar
      </button>
    </form>
  )
}
