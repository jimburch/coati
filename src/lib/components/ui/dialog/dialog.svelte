<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';

	let { ...restProps }: DialogPrimitive.RootProps = $props();
</script>

<DialogPrimitive.Root {...restProps} />
