<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';

	let { ...restProps }: AlertDialogPrimitive.RootProps = $props();
</script>

<AlertDialogPrimitive.Root {...restProps} />
